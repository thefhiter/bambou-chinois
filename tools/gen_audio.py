"""Synthesises every audio clip of the app with edge-tts, and checks what it recorded.

    python tools/gen_audio.py            (needs: pip install edge-tts pypinyin numpy, and ffmpeg)

- audio/w/<id>.mp3                 words, sentences, dialogue lines
- audio/py/<syllable><tone>.mp3    every pinyin syllable in each tone that exists
- audio/index.json                 manifest read by the app
- tools/audio-made.json            what each clip was made from (so a re-run only redoes what changed)

Every single-syllable clip is measured (tools/tonecheck.py): if the pitch does not draw the right
tone, the syllable is recorded again another way (other punctuation, slower, inside a short phrase,
another character with the same reading) until it does. A chart syllable that never comes out right
gets no clip at all. Every clip is then trimmed and levelled (tools/polish_audio.py).
"""
import asyncio, hashlib, json, os, shutil, sys, tempfile
from concurrent.futures import ProcessPoolExecutor
import edge_tts
from pypinyin import pinyin, lazy_pinyin, Style

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tonecheck
from polish_audio import polish, cut_first, emphasise_onset, emphasise_buzz

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
VOICE = 'zh-CN-XiaoxiaoNeural'          # pinyin chart: every clip of this voice is tone-checked
# Lesson words and sentences. Chosen by ear by the learners (voice-test page, 2026-11-12): it says
# h as a clear "kh" (好 = khao) and r close to French "j" (人 = jen). Its pitch is too low for
# tonecheck.py to follow, so its clips are not tone-checked or retouched: they are used as recorded.
LESSON_VOICE = 'zh-CN-YunjianNeural'
LESSON_RATE = -10
RECIPE = 'v8'   # bump to record every lesson clip again
SINGLE_RATE = -30   # one-syllable lesson words are said slower than phrases (-18): they are very short

# What is sent to the voice when it would misread the real text. The app still shows the real text.
#   哪: every zh-CN voice says "něi" (colloquial); the textbook teaches nǎ. 乸 is read as a plain nǎ.
SAY = {'哪': '乸'}
# Only for a clip of the character on its own (tools/readcheck.py measures how the voice reads them):
#   兴 alone is read xīng; the lesson needs xìng (高兴). 杏 is read xìng, identical audio.
SAY_ALONE = {'兴': '杏'}

# Characters of the lesson (and a few syllables the dictionary lists under another reading).
OVERRIDES = {
    'shei2': '谁', 'fo2': '佛', 'bu4': '不', 'ni3': '你', 'ta1': '她', 'ren2': '人', 'shi4': '是', 'na3': '哪',
    'wen4': '问', 'qing3': '请', 'ye3': '也', 'fa3': '法', 'mei3': '美', 'zhong1': '中', 'guo2': '国',
    'you3': '友', 'peng2': '朋', 'ming2': '名', 'zi4': '字', 'jiao4': '叫', 'hao3': '好', 'xiao3': '小',
    'nv3': '女', 'wo3': '我', 'ma3': '马', 'ri4': '日', 'da4': '大', 'ren4': '认', 'shen2': '什',
}
# Characters the voice reads as another syllable than the dictionary's first reading, with a tone
# that happens to fit (found by crosscheck.py): never used for the chart.
MISREAD = set('啜挝折脯')
# Syllables left without a clip: the only character for them is read another way by the voice.
NO_CLIP = {'shui2'}   # 谁 is read shéi
# Tone of the lesson's one-character clips when the dictionary's first reading is not the lesson's.
LESSON_TONE = {'什': 2, '谁': 2, '哪': 3, '么': 5, '吗': 5, '呢': 5, '不': 4, '法': 3, '好': 3, '中': 1, '叫': 4, '国': 2}

# Ways of recording one syllable, tried in this order until the tone measures right: (suffix, rate, pitch).
# A CARRIER suffix makes a short phrase (屋 + 的话): the syllable is then cut out of it. Said alone, some
# syllables get a falling "end of sentence" melody; inside a phrase they keep their own tone.
CARRIERS = ('的话', '吧')
WAYS = {
    1: [('', 0, 0), ('？', 0, 0), ('，', 0, 0), ('的话', -15, 0), ('吧', -15, 0), ('？', -15, 0)],
    2: [('', 0, 0), ('？', 0, 0), ('！', 0, 0), ('？', -15, 0), ('的话', -15, 0)],
    3: [('', 0, 0), ('，', 0, 0), ('！', 0, 0), ('', -15, 0), ('的话', -15, 0)],
    4: [('', 0, 0), ('！', 0, 0), ('，', 0, 0), ('！', -15, 0), ('的话', -15, 0), ('吧', -15, 0)],
    5: [(s, 10, p) for p in (0, -10, -18, -25) for s in ('：', '，', '')],   # neutral tone: light, lower, shorter
}


# Consonants the voice says too softly for a learner: the noise that opens the clip is made louder
# (polish_audio). initial -> the treatment and its settings
#   h = the throat sound of Arabic خ ("khao"): its noise is made louder and longer
#   r = close to French "j" ("jen"): its hiss is brought out
ONSET_FX = {'h': (emphasise_onset, 12.0, 1.5), 'r': (emphasise_buzz, 14.0)}


def onset_fx(ch):
    """The ONSET_FX entry for a character (by its pinyin initial), or None."""
    py = lazy_pinyin(ch)[0]
    return None if py[:2] in ('zh', 'ch', 'sh') else ONSET_FX.get(py[0])


def han(text):
    return [ch for ch in text if '一' <= ch <= '鿿']


def syllable_chars(syllables):
    """For each (syllable, tone) that exists in Mandarin: common characters read that way, best first."""
    want = set(syllables)
    found = {}  # key -> [(rank, char)]
    for hi in range(0xB0, 0xF8):  # GB2312: level 1 (common) then level 2
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode('gb2312')
                readings = pinyin(ch, style=Style.TONE3, heteronym=True, neutral_tone_with_five=True)[0]
            except Exception:
                continue
            if not readings:
                continue
            key = readings[0]
            if key[:-1] in want and key[-1] in '1234' and ch not in MISREAD:
                # common set first, then fewest alternative readings
                found.setdefault(key, []).append(((0 if hi < 0xD8 else 1, len(readings)), ch))
    return {k: [c for _, c in sorted(v, key=lambda rc: rc[0])] for k, v in found.items()}


async def tts(text, path, voice=None, rate=-18, pitch=0):
    for attempt in range(5):
        try:
            await asyncio.wait_for(
                edge_tts.Communicate(text, voice or VOICE, rate=f'{rate:+d}%', pitch=f'{pitch:+d}Hz').save(path), 25)
            if os.path.getsize(path) > 500:
                return True
        except Exception:  # network hiccup or stalled connection: retry
            await asyncio.sleep(2 + attempt * 3)
    print('FAILED', text, path, file=sys.stderr)
    if os.path.exists(path):
        os.remove(path)
    return False


class Studio:
    def __init__(self, tmp):
        self.tmp, self.n = tmp, 0
        self.net = asyncio.Semaphore(5)
        self.pool = ProcessPoolExecutor(3)
        self.ref = tonecheck.VOICE_REF[VOICE]

    async def judge(self, path, tone):
        return await asyncio.get_running_loop().run_in_executor(self.pool, tonecheck.judge, path, tone, self.ref)

    async def syllable(self, chars, tone, dest, base_rate, existing=None, fx=None):
        """Record one syllable so that its tone measures right, and put it at `dest`.
        `existing` = (char, way) of a take already at `dest`: kept if it passes.
        Returns (char, way, is_the_existing_take), or None when no take carries the tone."""
        if existing:
            ok, _, _ = await self.judge(dest, tone)
            if ok:
                return existing[0], existing[1], True
        best = None  # (distance, char, way, path)
        for ch in chars:
            for way in WAYS[tone]:
                suffix, rate, pitch = way
                self.n += 1
                path = os.path.join(self.tmp, f'{self.n}.mp3')
                async with self.net:
                    if not await tts(SAY.get(ch, ch) + suffix, path, None, base_rate + rate, pitch):
                        continue
                if suffix in CARRIERS and not cut_first(path):
                    continue
                if fx:
                    fx[0](path, *fx[1:])
                polish(path)   # measured as it will be heard
                ok, dist, _ = await self.judge(path, tone)
                if ok and (best is None or dist < best[0]):
                    best = (dist, ch, way, path)
                    if tone != 5:      # neutral tone: compare all the ways and keep the closest
                        break
            if best:
                break
        if best is None:
            return None
        shutil.copyfile(best[3], dest)
        return best[1], f'{best[2][0]}{best[2][1]:+d}{best[2][2]:+d}', False


def signature(*parts):
    return hashlib.md5('|'.join(map(str, parts)).encode()).hexdigest()[:8]


async def main():
    with open(os.path.join(ROOT, 'tools', 'audio-list.json'), encoding='utf-8') as f:
        spec = json.load(f)
    wdir, pdir = os.path.join(ROOT, 'audio', 'w'), os.path.join(ROOT, 'audio', 'py')
    os.makedirs(wdir, exist_ok=True)
    os.makedirs(pdir, exist_ok=True)
    made_path = os.path.join(ROOT, 'tools', 'audio-made.json')
    try:
        with open(made_path, encoding='utf-8') as f:
            made = json.load(f)
    except OSError:
        made = {}
    try:
        with open(os.path.join(ROOT, 'audio', 'index.json'), encoding='utf-8') as f:
            old_chars = json.load(f).get('chars', {})
    except OSError:
        old_chars = {}

    tmp = tempfile.mkdtemp(prefix='bambou-audio-')
    studio = Studio(tmp)
    notes = []

    # ---- lesson clips -------------------------------------------------------------------------
    async def lesson_clip(c):
        dest = os.path.join(wdir, c['id'] + '.mp3')
        text = ''.join(SAY.get(ch, ch) for ch in c['text'])
        if len(han(c['text'])) == 1:
            text = ''.join(SAY_ALONE.get(ch, ch) for ch in text)
        voice = c.get('voice') or LESSON_VOICE
        sig = signature(text, voice, RECIPE)
        if os.path.exists(dest) and made.get('w/' + c['id']) == sig:
            return True
        chars = han(c['text'])
        checked = voice in tonecheck.VOICE_REF        # only a voice the tone check can follow is retouched
        single = len(chars) == 1 and checked
        rate = SINGLE_RATE if single else LESSON_RATE if voice == LESSON_VOICE else -18
        fx = onset_fx(chars[0]) if checked and chars and c['text'].startswith(chars[0]) else None
        async with studio.net:
            if not await tts(text, dest, voice, rate):
                return False
        if fx:
            fx[0](dest, *fx[1:])
        polish(dest)
        if single:   # the plain take is the fallback; a take whose tone measures right replaces it
            ch = chars[0]
            tone = LESSON_TONE.get(ch) or int(lazy_pinyin(ch, style=Style.TONE3, neutral_tone_with_five=True)[0][-1])
            if await studio.syllable([ch], tone, dest, rate, (ch, ''), fx) is None:
                notes.append(f'lesson clip {c["id"]} {ch}: tone {tone} did not measure right, kept the plain take')
        made['w/' + c['id']] = sig
        return True

    # ---- pinyin chart -------------------------------------------------------------------------
    cands = syllable_chars(spec['syllables'])
    for k, ch in OVERRIDES.items():
        cands[k] = [ch] + [c for c in cands.get(k, []) if c != ch]
    for k in NO_CLIP:
        cands.pop(k, None)
        made.pop('py/' + k, None)
        if os.path.exists(os.path.join(pdir, k + '.mp3')):
            os.remove(os.path.join(pdir, k + '.mp3'))
    chosen = {}

    async def chart_clip(k):
        dest = os.path.join(pdir, k + '.mp3')
        chars = cands[k][:6]
        fx = ONSET_FX.get(k[0])
        existing = None
        if os.path.exists(dest) and os.path.getsize(dest) > 500:
            if 'py/' + k in made and fx and not made['py/' + k].endswith('fx3'):
                os.remove(dest)                      # treated another way before: record it again from scratch
                del made['py/' + k]
            elif 'py/' + k in made:          # recorded by this script: check it again, keep it if it passes
                ch, _, way = made['py/' + k].partition(' ')
                existing = (ch, way.removesuffix('fx3').removesuffix('fx2').removesuffix('kh').strip())
            elif old_chars.get(k):         # a clip from before the tone check
                existing = (old_chars[k], '')
                polish(dest)
        if existing:
            chars = [existing[0]] + [c for c in chars if c != existing[0]][:5]
        take = await studio.syllable(chars, int(k[-1]), dest, -25, existing, fx)
        if take is None and fx:   # the treated consonant upsets the tone measure: keep this one untreated
            take, fx = await studio.syllable(chars, int(k[-1]), dest, -25, None, None), None
        if take is None:
            notes.append(f'chart {k} ({"".join(chars)}): no take carries tone {k[-1]} - left without sound')
            if os.path.exists(dest):
                os.remove(dest)
            made.pop('py/' + k, None)
            return False
        ch, way, kept = take
        made['py/' + k] = f'{ch} {way}'.strip() + (' fx3' if fx else '')
        chosen[k] = ch
        return True

    keys = sorted(cands)
    results = await asyncio.gather(*[lesson_clip(c) for c in spec['clips']], *[chart_clip(k) for k in keys])
    studio.pool.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)

    n = len(spec['clips'])
    tones = {}
    for k, ok in zip(keys, results[n:]):
        if ok:
            tones[k[:-1]] = tones.get(k[:-1], '') + k[-1]
    words = [c['id'] for c, ok in zip(spec['clips'], results[:n]) if ok]
    with open(os.path.join(ROOT, 'audio', 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'v': signature(json.dumps(made, sort_keys=True, ensure_ascii=False)), 'words': words, 'tones': tones,
                   'chars': {k: chosen[k] for k in sorted(chosen)}}, f,
                  ensure_ascii=False, separators=(',', ':'))
    with open(made_path, 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(made.items())), f, ensure_ascii=False, indent=0)
    missing = [s for s in spec['syllables'] if s not in tones]
    print(f'words {len(words)}/{n}  syllable clips {sum(results[n:])}/{len(keys)}  syllables without audio: {missing}')
    for line in sorted(notes):
        print(' -', line)


if __name__ == '__main__':
    asyncio.run(main())
