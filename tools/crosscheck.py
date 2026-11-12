"""Second check of the pinyin chart: is each clip the right *syllable* (not only the right tone)?

    python tools/crosscheck.py            (or: python tools/crosscheck.py zhe2 wo1  to check a few)

The voice turns text into sounds before speaking, so two different characters with the same reading
come out as the same audio. For every chart clip, this script records the clip's character and other
characters the dictionary gives the same reading, and compares them:
  - same audio as another character  -> the reading is confirmed
  - differs from all of them         -> listed as suspect (the voice may read that character another way)
Suspects are fixed by hand in gen_audio.py (OVERRIDES to force a character, NO_CLIP to drop the clip).
Needs: edge-tts, pypinyin, numpy, ffmpeg.
"""
import asyncio, json, os, shutil, sys, tempfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tonecheck
from gen_audio import ROOT, SAY, OVERRIDES, syllable_chars, tts

SR = tonecheck.SR
SAME = 1.0   # below this distance two takes are the same sounds


def mfcc(path, n_mel=26, n_c=13):
    x = tonecheck.decode(path)
    env = np.abs(x)
    idx = np.where(env > 0.03 * env.max())[0]
    x = x[max(0, idx[0] - 160): idx[-1] + 160]
    x = np.append(x[0], x[1:] - 0.97 * x[:-1])
    win, hop, nfft = 400, 160, 512
    n = 1 + (len(x) - win) // hop
    frames = np.stack([x[i * hop:i * hop + win] for i in range(n)]) * np.hamming(win)
    power = np.abs(np.fft.rfft(frames, nfft)) ** 2
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    pts = 700 * (10 ** (np.linspace(mel(100), mel(7000), n_mel + 2) / 2595) - 1)
    bins = np.floor((nfft + 1) * pts / SR).astype(int)
    fb = np.zeros((n_mel, nfft // 2 + 1))
    for i in range(n_mel):
        a, b, c = bins[i], bins[i + 1], bins[i + 2]
        fb[i, a:b] = (np.arange(a, b) - a) / max(1, b - a)
        fb[i, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    logmel = np.log(power @ fb.T + 1e-8)
    dct = np.cos(np.pi * np.outer(np.arange(1, n_c), (2 * np.arange(n_mel) + 1)) / (2 * n_mel))
    m = logmel @ dct.T
    return m - m.mean(0)


def dtw(a, b):
    d = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1))
    n, m = d.shape
    acc = np.full((n + 1, m + 1), np.inf)
    acc[0, 0] = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            acc[i, j] = d[i - 1, j - 1] + min(acc[i - 1, j], acc[i, j - 1], acc[i - 1, j - 1])
    return acc[n, m] / (n + m)


async def main():
    with open(os.path.join(ROOT, 'tools', 'audio-list.json'), encoding='utf-8') as f:
        syllables = json.load(f)['syllables']
    with open(os.path.join(ROOT, 'audio', 'index.json'), encoding='utf-8') as f:
        chosen = json.load(f)['chars']
    cands = syllable_chars(syllables)
    tmp = tempfile.mkdtemp(prefix='bambou-cross-')
    net = asyncio.Semaphore(5)
    cache = {}

    async def take(ch):
        if ch not in cache:
            path = os.path.join(tmp, f'{ord(ch):x}.mp3')
            async with net:
                cache[ch] = mfcc(path) if await tts(SAY.get(ch, ch), path, None, -25) else None
        return cache[ch]

    async def check(k):
        ch = chosen[k]
        others = [c for c in cands.get(k, []) if c != ch][:3]
        if not others:
            return k, ch, 'alone', ''
        mine = await take(ch)
        if mine is None:
            return k, ch, 'error', ''
        seen = []
        for o in others:
            other = await take(o)
            if other is None:
                continue
            dist = dtw(mine, other)
            seen.append(f'{o}={dist:.1f}')
            if dist < SAME:
                return k, ch, 'confirmed', o
        # do the other characters agree with each other? then they carry the dictionary reading
        for i in range(len(others)):
            for j in range(i + 1, len(others)):
                a, b = cache.get(others[i]), cache.get(others[j])
                if a is not None and b is not None and dtw(a, b) < SAME:
                    return k, ch, 'suspect', f'{others[i]} and {others[j]} agree with each other, not with {ch}'
        return k, ch, 'unclear', ' '.join(seen)

    only = sys.argv[1:]   # optional: just these syllables, e.g. zhe2 wo1
    results = await asyncio.gather(*[check(k) for k in sorted(chosen) if not only or k in only])
    shutil.rmtree(tmp, ignore_errors=True)
    count = {}
    for k, ch, verdict, info in results:
        count[verdict] = count.get(verdict, 0) + 1
    print(count)
    for verdict in ('suspect', 'unclear', 'error'):
        for k, ch, v, info in results:
            if v == verdict:
                print(f'{verdict:8s} {k:8s} {ch}  {info}{"  (lesson character)" if OVERRIDES.get(k) == ch else ""}')


if __name__ == '__main__':
    asyncio.run(main())
