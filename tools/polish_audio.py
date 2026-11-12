"""Makes every clip start at once, end cleanly and play at the same loudness.

    python tools/polish_audio.py         -> polishes audio/w and audio/py in place

Cuts the silence the voice service leaves around the speech (about 0.2 s before, up to 1.3 s after),
adds short fades, and brings every clip to the same level. gen_audio.py calls polish() on each new clip.
Needs numpy and ffmpeg.
"""
import os, subprocess, sys
import numpy as np

SR = 24000
TARGET_RMS_DB = -19.0   # level of the spoken part
PEAK_DB = -1.0          # never louder than this
HEAD, TAIL = 0.03, 0.16  # silence kept before / after the speech, seconds


def _decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def _encode(x, path):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    tmp = path + '.tmp.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '64k', tmp], input=pcm, check=True)
    os.replace(tmp, path)


def polish(path):
    """Trim, fade and level one clip in place. Returns False when the clip holds no speech."""
    x = _decode(path)
    if len(x) < SR // 20:
        return False
    hop = SR // 100
    n = len(x) // hop
    env = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    loud = np.where(env > 0.03 * env.max())[0]
    if len(loud) == 0:
        return False
    a = max(0, loud[0] * hop - int(HEAD * SR))
    b = min(len(x), (loud[-1] + 1) * hop + int(TAIL * SR))
    speech = x[loud[0] * hop:(loud[-1] + 1) * hop]
    x = x[a:b].copy()
    rms = np.sqrt(np.mean(speech ** 2)) + 1e-9
    gain = 10 ** (TARGET_RMS_DB / 20) / rms
    gain = min(gain, 10 ** (PEAK_DB / 20) / (np.max(np.abs(x)) + 1e-9))
    x *= gain
    fi, fo = int(0.008 * SR), int(0.05 * SR)
    x[:fi] *= np.linspace(0, 1, fi)
    x[-fo:] *= np.linspace(1, 0, fo)
    _encode(x, path)
    return True


def cut_first(path):
    """Keep only the first syllable of a two-syllable take whose second syllable starts with a stop
    consonant (e.g. 屋 + 的): the cut falls in the short silence of the stop. False if there is none."""
    x = _decode(path)
    hop = SR // 200
    n = len(x) // hop
    if n < 20:
        return False
    env = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    peak = env.max()
    loud = np.where(env > 0.25 * peak)[0]
    if len(loud) == 0:
        return False
    start = loud[0]
    # first quiet stretch (the stop's closure) at least 100 ms after the syllable begins
    for i in range(start + 20, n - 4):
        if env[i] < 0.06 * peak and np.all(env[i:i + 3] < 0.08 * peak):
            after = env[i:]
            if after.max() < 0.2 * peak:      # nothing follows: this was the end, not a closure
                return False
            end = (i + 1) * hop
            y = x[:end].copy()
            fo = int(0.03 * SR)
            y[-fo:] *= np.linspace(1, 0, fo)
            _encode(np.concatenate([y, np.zeros(int(0.05 * SR), dtype=np.float32)]), path)
            return True
    return False


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio')
    n = 0
    for sub in ('w', 'py'):
        for f in sorted(os.listdir(os.path.join(root, sub))):
            if f.endswith('.mp3') and not f.endswith('.tmp.mp3'):
                n += polish(os.path.join(root, sub, f))
    print('polished', n, 'clips')
