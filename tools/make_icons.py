"""Draws the app icon (red seal with 竹). Needs Pillow and a CJK font (Microsoft YaHei on Windows)."""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
FONT = next(p for p in [r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'] if os.path.exists(p))
def icon(size, name, maskable=False):
    s = size * 4
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable: d.rectangle([0, 0, s, s], fill='#C92F26')
    else: d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.23), fill='#C92F26')
    f = ImageFont.truetype(FONT, int(s * (0.5 if maskable else 0.62)))
    box = d.textbbox((0, 0), '竹', font=f)
    d.text(((s - box[2] - box[0]) / 2, (s - box[3] - box[1]) / 2), '竹', font=f, fill='#FFF8EC')
    img.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, name))
icon(192, 'icon-192.png'); icon(512, 'icon-512.png'); icon(512, 'icon-maskable-512.png', True)
