"""Build small, square orbit textures; detail views keep the originals."""
from pathlib import Path
import re
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = (root / 'src/project-gallery-data.js').read_text(encoding='utf-8')
paths = set(re.findall(r"src: '(/karya/[^']+)'", source))
output = root / 'public/karya/thumbs'
output.mkdir(exist_ok=True)
for url in sorted(paths):
    path = root / 'public' / url.lstrip('/')
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        thumb = ImageOps.fit(image, (960, 960), method=Image.Resampling.LANCZOS)
        target = output / (path.name + '.webp')
        thumb.save(target, 'WEBP', quality=86, method=6)
        print(f'{path.name}: {path.stat().st_size:,} -> {target.stat().st_size:,} bytes')
