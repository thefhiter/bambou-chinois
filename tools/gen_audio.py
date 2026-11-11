"""Synthesises every audio clip of the app with edge-tts.

    python tools/gen_audio.py            (needs: pip install edge-tts pypinyin)

- audio/w/<id>.mp3          words, sentences, dialogue lines
- audio/py/<syllable><tone>.mp3   every pinyin syllable in each tone that exists
- audio/index.json          manifest read by the app
Existing files are kept, so the script can be re-run safely.
"""
import asyncio, json, os, sys
import edge_tts
from pypinyin import pinyin, Style

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
VOICE = 'zh-CN-XiaoxiaoNeural'


# Characters of the lesson (and a few syllables the dictionary lists under another reading).
OVERRIDES = {
    'shei2': '谁', 'fo2': '佛', 'bu4': '不', 'ni3': '你', 'ta1': '她', 'ren2': '人', 'shi4': '是', 'na3': '哪',
    'wen4': '问', 'qing3': '请', 'ye3': '也', 'fa3': '法', 'mei3': '美', 'zhong1': '中', 'guo2': '国',
    'you3': '友', 'peng2': '朋', 'ming2': '名', 'zi4': '字', 'jiao4': '叫', 'hao3': '好', 'xiao3': '小',
    'nv3': '女', 'wo3': '我', 'ma3': '马', 'ri4': '日', 'da4': '大', 'ren4': '认', 'shen2': '什',
}


def syllable_chars(syllables):
    """Pick one common character for each (syllable, tone) that exists in Mandarin."""
    want = set(syllables)
    best = {}  # key -> (rank, char)

    def consider(ch, level):
        try:
            readings = pinyin(ch, style=Style.TONE3, heteronym=True, neutral_tone_with_five=True)[0]
        except Exception:
            return
        if not readings:
            return
        key = readings[0]
        syl, tone = key[:-1], key[-1]
        if syl not in want or tone not in '1234':
            return
        rank = (level, len(readings))  # common set first, then fewest alternative readings
        if key not in best or rank < best[key][0]:
            best[key] = (rank, ch)

    for hi in range(0xB0, 0xF8):  # GB2312: level 1 (common) then level 2
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode('gb2312')
            except UnicodeDecodeError:
                continue
            consider(ch, 0 if hi < 0xD8 else 1)
    return {k: v[1] for k, v in best.items()}


async def synth(text, path, voice, rate, sem):
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return True
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice or VOICE, rate=rate).save(path)
                if os.path.getsize(path) > 500:
                    return True
            except Exception as e:  # network hiccup: retry
                err = e
                await asyncio.sleep(1 + attempt * 2)
        print('FAILED', text, path, file=sys.stderr)
        if os.path.exists(path):
            os.remove(path)
        return False


async def main():
    with open(os.path.join(ROOT, 'tools', 'audio-list.json'), encoding='utf-8') as f:
        spec = json.load(f)
    os.makedirs(os.path.join(ROOT, 'audio', 'w'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'audio', 'py'), exist_ok=True)
    sem = asyncio.Semaphore(6)

    jobs = [synth(c['text'], os.path.join(ROOT, 'audio', 'w', c['id'] + '.mp3'), c.get('voice'), '-18%', sem)
            for c in spec['clips']]
    chars = syllable_chars(spec['syllables'])
    chars.update(OVERRIDES)
    try:  # a clip whose character changed must be synthesised again
        with open(os.path.join(ROOT, 'audio', 'index.json'), encoding='utf-8') as f:
            old = json.load(f).get('chars', {})
    except OSError:
        old = {}
    for k, ch in chars.items():
        path = os.path.join(ROOT, 'audio', 'py', k + '.mp3')
        if old.get(k) not in (None, ch) and os.path.exists(path):
            os.remove(path)
    keys = sorted(chars)
    jobs += [synth(chars[k], os.path.join(ROOT, 'audio', 'py', k + '.mp3'), None, '-25%', sem) for k in keys]
    results = await asyncio.gather(*jobs)

    n = len(spec['clips'])
    tones, example = {}, {}
    for k, ok in zip(keys, results[n:]):
        if ok:
            tones.setdefault(k[:-1], '')
            tones[k[:-1]] += k[-1]
            example[k] = chars[k]
    words = [c['id'] for c, ok in zip(spec['clips'], results[:n]) if ok]
    with open(os.path.join(ROOT, 'audio', 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'words': words, 'tones': tones, 'chars': example}, f, ensure_ascii=False, separators=(',', ':'))
    missing = [s for s in spec['syllables'] if s not in tones]
    print(f'words {len(words)}/{n}  syllable clips {sum(results[n:])}/{len(keys)}  syllables without audio: {missing}')


asyncio.run(main())
