from PIL import Image
import numpy as np

# Load sig_shot.png
img = Image.open(r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\sig_shot.png').convert('L')
arr = np.array(img)
# Find bounding box of non-white pixels
mask = arr < 200
coords = np.argwhere(mask)
ymin, xmin = coords.min(axis=0)
ymax, xmax = coords.max(axis=0)
print(f"BBox in image: x={xmin}..{xmax}, y={ymin}..{ymax}, size={xmax-xmin+1}x{ymax-ymin+1}")
print(f"Image total size: {img.size}")
