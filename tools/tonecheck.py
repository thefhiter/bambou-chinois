"""Measures the pitch contour of a clip and tells which Mandarin tone it carries.

Used by gen_audio.py to verify every single-syllable clip, and usable on its own:
    python tools/tonecheck.py            -> table for audio/py, exit code 1 if a clip fails
Needs numpy and ffmpeg.
"""
import os, subprocess, sys
import numpy as np

SR = 16000

# Typical contour of each tone in a slow, isolated syllable: mean pitch of five equal time slices,
# in semitones relative to the voice's middle pitch. Measured on the clips of the pinyin chart.
TEMPLATES = {
    1: [1.2, 1.3, 1.4, 1.6, 1.6],        # high and level
    2: [-4.9, -5.5, -5.4, -3.6, -0.6],   # starts low, climbs
    3: [-4.4, -5.6, -6.1, -5.5, -4.3],   # stays low (dip)
    4: [2.3, 2.0, 0.9, -2.4, -4.9],      # starts high, drops
    5: [-1.0, -1.5, -2.0, -2.6, -3.2],   # neutral: mid, light, drifting down
}
# Middle pitch (semitones re 100 Hz) of the voice the app uses, measured the same way.
VOICE_REF = {'zh-CN-XiaoxiaoNeural': 18.2}


def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(sr), '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def f0_track(x, fmin=75, fmax=520):
    """Normalised autocorrelation pitch track. Returns (times, f0) for voiced frames only."""
    win, hop = int(0.04 * SR), int(0.01 * SR)
    lo, hi = int(SR / fmax), int(SR / fmin)
    if len(x) < win + hi:
        return np.array([]), np.array([])
    peak = np.max(np.abs(x)) or 1.0
    ts, fs = [], []
    for i in range(0, len(x) - win - hi, hop):
        a = x[i:i + win]
        if np.sqrt(np.mean(a * a)) < 0.03 * peak:
            continue
        seg = x[i:i + win + hi]
        e0 = np.dot(a, a)
        corr = np.array([np.dot(a, seg[l:l + win]) / np.sqrt(e0 * np.dot(seg[l:l + win], seg[l:l + win]) + 1e-12)
                         for l in range(lo, hi)])
        k = int(np.argmax(corr))
        if corr[k] < 0.55:
            continue
        # prefer the shortest lag that is nearly as good (avoids octave-down errors)
        for j in range(1, k):
            if corr[j] > 0.92 * corr[k] and corr[j] >= corr[j - 1] and corr[j] >= corr[j + 1]:
                k = j
                break
        ts.append(i / SR)
        fs.append(SR / (lo + k))
    return np.array(ts), np.array(fs)


def contour(path):
    """Semitone contour (re 100 Hz) on a 0..1 time axis, outliers removed, median-smoothed."""
    t, f = f0_track(decode(path))
    if len(f) < 8:
        return None
    st = 12 * np.log2(f / 100.0)
    med = np.median(st)
    keep = np.abs(st - med) < 10
    t, st = t[keep], st[keep]
    if len(st) < 8:
        return None
    st = np.array([np.median(st[max(0, i - 2):i + 3]) for i in range(len(st))])
    x = (t - t[0]) / max(1e-6, t[-1] - t[0])
    return x, st, t[-1] - t[0]


def profile(path, ref):
    """Five-slice pitch profile relative to the voice's middle pitch, and the voiced duration."""
    c = contour(path)
    if c is None:
        return None, 0.0
    x, st, dur = c
    q = np.array([np.mean(st[(x >= a) & (x <= a + 0.2001)]) if np.any((x >= a) & (x <= a + 0.2001)) else np.nan
                  for a in (0, 0.2, 0.4, 0.6, 0.8)]) - ref
    return np.where(np.isnan(q), np.nanmean(q), q), dur


def sounds_like(q):
    """Which tone a five-slice profile draws: 1-4, or 0 when it is none of them clearly."""
    start, end = max(q[0], q[1]), q[4]
    if min(q[1:]) >= -1.2 and q[0] >= -2.5 and start - end < 2.5:
        return 1                                   # stays high (a voiced consonant may start a little lower)
    if ((start >= 0 and start - end >= 3.5) or (start >= -0.6 and start - end >= 4.5)) and end <= q[2]:
        return 4                                   # starts high and drops
    if min(q[:3]) <= -3.0 and end - min(q) >= 3.2 and end > -2.0:
        return 2                                   # starts low and clearly climbs
    if np.mean(q[1:4]) <= -3.0 and end <= -2.0:
        return 3                                   # stays low; a small rise at the very end is the full 3rd tone
    return 0


def judge(path, want, ref):
    """(passes, distance to the wanted tone's typical contour, tone it sounds like)."""
    q, dur = profile(path, ref)
    if q is None or not 0.1 <= dur <= 0.9:
        return False, 99.0, 0
    dist = float(np.sqrt(np.mean((q - np.array(TEMPLATES[want])) ** 2)))
    if want == 5:                                  # neutral tone: no fixed shape, the closest take wins
        return dist <= 2.0, dist, 5
    got = sounds_like(q)
    return got == want, dist, got


def reference(paths):
    """Middle pitch of a voice: median over many clips of mixed tones."""
    vals = []
    for p in paths:
        c = contour(p)
        if c is not None:
            vals.append(np.median(c[1]))
    return float(np.median(vals)) if vals else 12.0


if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio', 'py')
    files = sorted(f for f in os.listdir(root) if f.endswith('.mp3'))
    ref = VOICE_REF['zh-CN-XiaoxiaoNeural']
    table = np.zeros((5, 5), dtype=int)
    bad = []
    for f in files:
        want = int(f[-5])
        ok, dist, got = judge(os.path.join(root, f), want, ref)
        table[want][got] += 1
        if not ok:
            bad.append(f'{f[:-4]}->{got}')
    print('rows = expected tone, columns = measured (0 = unclear)')
    for w in range(1, 5):
        print(w, table[w], f'{100 * table[w][w] / max(1, table[w].sum()):.0f}%')
    print(len(files), 'clips,', len(bad), 'fail the check:', ' '.join(bad))
    sys.exit(1 if bad else 0)
