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


def emphasise_onset(path, gain_db=8.0, stretch=1.0):
    """Make the noisy consonant that opens a clip louder and longer. Used for pinyin h (the "kh" of
    Arabic kha) and r (close to French "j"), which the voice says very softly. Only the noise before
    the vowel is touched. False if the clip does not open with such a noise."""
    x = _decode(path)
    win, hop, nfft = int(0.02 * SR), int(0.005 * SR), 1024
    n = 1 + (len(x) - win) // hop
    if n < 20:
        return False
    frames = np.stack([x[i * hop:i * hop + win] for i in range(n)]) * np.hanning(win)
    power = np.abs(np.fft.rfft(frames, nfft)) ** 2
    freq = np.fft.rfftfreq(nfft, 1 / SR)
    energy = power.sum(1)
    low = power[:, freq < 500].sum(1) / (energy + 1e-12)
    peak = energy.max()
    heard = np.where(energy > 0.0005 * peak)[0]
    if len(heard) == 0:
        return False
    start = heard[0]
    voiced = [i for i in range(start, n - 2) if low[i] > 0.35 and energy[i] > 0.05 * peak and low[i + 1] > 0.35]
    if not voiced or (voiced[0] - start) * hop < 0.04 * SR:
        return False
    a, b = start * hop, voiced[0] * hop           # the consonant's noise: samples a..b
    noise = x[a:b]
    if stretch > 1.0:                             # lengthen it: overlap short grains read more slowly
        grain, step = int(0.02 * SR), int(0.005 * SR)
        length = int(len(noise) * stretch)
        out = np.zeros(length + grain, dtype=np.float32)
        norm = np.zeros(length + grain, dtype=np.float32)
        w = np.hanning(grain).astype(np.float32)
        for pos in range(0, length, step):
            src = min(int(pos / stretch), max(0, len(noise) - grain))
            piece = noise[src:src + grain]
            out[pos:pos + len(piece)] += piece * w[:len(piece)]
            norm[pos:pos + len(piece)] += w[:len(piece)] ** 2
        noise = (out / np.sqrt(np.maximum(norm, 1e-3)))[:length]   # grains of noise add up in power
    g = 10 ** (gain_db / 20)
    ramp = min(len(noise), int(0.01 * SR))
    noise = noise * g
    noise[:ramp] *= np.linspace(1 / g, 1, ramp)
    tail = x[b:].copy()                           # glide back to normal as the vowel starts
    glide = min(len(tail), int(0.02 * SR))
    tail[:glide] *= np.linspace(g, 1, glide)
    y = np.concatenate([x[:a], noise, tail]).astype(np.float32)
    top = np.max(np.abs(y))
    if top > 0.98:
        y *= 0.98 / top
    _encode(y, path)
    return True


def emphasise_buzz(path, gain_db=14.0):
    """Bring out the hiss of a voiced consonant that opens a clip (pinyin r, close to French "j"):
    the part of the sound above 1.8 kHz is raised during the consonant, before the vowel opens.
    False if no such consonant is found."""
    x = _decode(path)
    hop = int(0.005 * SR)
    n = len(x) // hop
    if n < 30:
        return False
    env = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    peak = env.max()
    heard = np.where(env > 0.03 * peak)[0]
    if len(heard) == 0:
        return False
    start = heard[0]
    vowel = [i for i in range(start, n - 2) if env[i] > 0.45 * peak and env[i + 1] > 0.45 * peak]
    if not vowel:
        return False
    length = min(max(vowel[0] - start, 0), int(0.14 * SR / hop))
    if length * hop < 0.04 * SR:
        return False
    a, b = start * hop, (start + length) * hop
    spec = np.fft.rfft(x)
    freq = np.fft.rfftfreq(len(x), 1 / SR)
    high = np.fft.irfft(spec * np.clip((freq - 1500) / 600, 0, 1), len(x)).astype(np.float32)
    shape = np.zeros(len(x), dtype=np.float32)
    ramp = int(0.015 * SR)
    shape[a:b] = 1
    shape[max(0, a - ramp):a] = np.linspace(0, 1, a - max(0, a - ramp))
    shape[b:b + ramp] = np.linspace(1, 0, len(shape[b:b + ramp]))
    y = x + (10 ** (gain_db / 20) - 1) * high * shape
    top = np.max(np.abs(y))
    if top > 0.98:
        y *= 0.98 / top
    _encode(y, path)
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
