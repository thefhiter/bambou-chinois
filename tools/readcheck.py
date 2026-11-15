"""Checks how the lesson voice READS a character that has more than one reading (都 dōu/dū, 兴 xìng/xīng…).

    python tools/readcheck.py

The voice gives the same audio for two characters it reads the same way (他 and 她 are both tā), so a
character is recorded next to an unambiguous character for each reading, and the closest one tells
which reading the voice used. Nobody has to listen: the answer is measured.
Prints one line per character: the reading heard, and the distance to each candidate (0 = identical).
"""
import asyncio, os, subprocess, sys, tempfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_audio import tts, LESSON_VOICE, LESSON_RATE

# character -> {reading: an unambiguous character with that reading}; the first reading is the wanted one
CHECK = {
    '都': {'dōu': '兜', 'dū': '督'},
    '兴': {'xìng': '杏', 'xīng': '星'},
    '识': {'shí': '石', 'shì': '式', 'zhì': '志'},
    '这': {'zhè': '浙', 'zhèi': '诶'},
    '们': {'men/mén': '门'},
    '欢': {'huān': '獾'},
    '什': {'shén': '神', 'shí': '十'},
    '么': {'me': '麽', 'mó': '魔', 'yāo': '腰'},
    '他': {'tā': '她'},
    '谁': {'shéi': '谁', 'shuí': '谁'},
    '好': {'hǎo': '郝', 'hào': '号'},
    '中': {'zhōng': '钟', 'zhòng': '众'},
    '只': {'zhǐ': '纸', 'zhī': '支'},
    '六': {'liù': '溜', 'lù': '路'},
    '家': {'jiā': '加', 'jie': '街'},
    '一': {'yī': '衣', 'yí': '移', 'yì': '亿'},
    '王': {'wáng': '亡', 'wàng': '旺'},
    '月': {'yuè': '越'},
    '对': {'duì': '队'},
    '高': {'gāo': '糕'},
    '真': {'zhēn': '针'},
    '书': {'shū': '舒'},
    '去': {'qù': '趣'},
    '爱': {'ài': '碍'},
    '姓': {'xìng': '杏'},
    '很': {'hěn': '狠'},
    '您': {'nín': '恁'},
}


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32)


def feat(x):
    """Log-spectrogram of the voiced part, trimmed, on a fixed number of frames."""
    x = x / (np.abs(x).max() + 1e-9)
    env = np.convolve(np.abs(x), np.ones(160) / 160, 'same')
    idx = np.where(env > 0.05)[0]
    if len(idx) < 400:
        return None
    x = x[idx[0]:idx[-1]]
    n, hop = 512, 160
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    spec = np.log(np.abs(np.fft.rfft(frames))[:, :160] + 1e-3)
    # resample to 40 frames so that small timing differences do not count
    t = np.linspace(0, len(spec) - 1, 40)
    return np.array([spec[int(round(i))] for i in t])


def dist(a, b):
    if a is None or b is None:
        return 99.0
    return float(np.mean(np.abs(a - b)))


async def main():
    tmp = tempfile.mkdtemp(prefix='readcheck-')
    sem = asyncio.Semaphore(5)
    chars = sorted({c for c in CHECK} | {r for v in CHECK.values() for r in v.values()})

    async def rec(c):
        path = os.path.join(tmp, f'{ord(c):x}.mp3')
        async with sem:
            await tts(c, path, LESSON_VOICE, LESSON_RATE)
        return c, path
    paths = dict(await asyncio.gather(*[rec(c) for c in chars]))
    F = {c: feat(pcm(p)) for c, p in paths.items() if os.path.exists(p)}
    bad = 0
    for c, refs in CHECK.items():
        ds = {r: dist(F.get(c), F.get(ref)) for r, ref in refs.items()}
        best = min(ds, key=ds.get)
        want = next(iter(refs))
        ok = best == want
        bad += not ok
        print(f'{c}  heard {best:8s} {"OK " if ok else "BAD"}  ' + '  '.join(f'{r}({refs[r]})={d:.2f}' for r, d in ds.items()))
    print('misread:', bad)


if __name__ == '__main__':
    asyncio.run(main())
