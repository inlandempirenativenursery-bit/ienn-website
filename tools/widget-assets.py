"""Bakes the widget images (run from repo root; needs Pillow + numpy):
   python3 tools/widget-assets.py <eric-widget-bg.jpg> <ienn-logo-sage-line-widget.jpg>
 - widgets/bg-small.jpg (510x510) / bg-medium.jpg (1092x510): Eric's photo, center-cropped to the widget shape (@3x),
   with a cream (#f8f6f3) wash at WASH opacity baked in.
 - widgets/logo.jpg: the approved logo, SCALED ONLY (480 px wide, same aspect; no crop/recolor/background change)."""
import sys
import numpy as np
from PIL import Image, ImageOps
WASH = 0.62
bg, logo = sys.argv[1], sys.argv[2]
src = Image.open(bg).convert('RGB'); cream = np.array([0xf8, 0xf6, 0xf3], float)
for name, size in [('small', (510, 510)), ('medium', (1092, 510))]:
    a = np.array(ImageOps.fit(src, size, Image.LANCZOS, centering=(0.5, 0.5)), float) * (1 - WASH) + cream * WASH
    Image.fromarray(a.round().astype('uint8')).save(f'widgets/bg-{name}.jpg', quality=82, optimize=True, progressive=True)
lg = Image.open(logo).convert('RGB'); W = 480
lg.resize((W, round(W * lg.height / lg.width)), Image.LANCZOS).save('widgets/logo.jpg', quality=92, optimize=True)
