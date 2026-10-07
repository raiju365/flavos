import json
import numpy as np

with open('scripts/svg_stroke_paths.json', 'r') as f:
    mask_paths = json.load(f)

# Parse each path into points
parsed = []
for idx, p in enumerate(mask_paths):
    tokens = p.split()
    pts = []
    i = 0
    while i < len(tokens):
        if tokens[i] in ['M', 'L']:
            pts.append([float(tokens[i+1]), float(tokens[i+2])])
            i += 3
        else:
            i += 1
    pts = np.array(pts)
    start_pt = pts[0]
    end_pt = pts[-1]
    mid_pt = np.mean(pts, axis=0)
    length = np.sum(np.linalg.norm(pts[1:] - pts[:-1], axis=1))
    parsed.append({
        'idx': idx,
        'd': p,
        'pts': pts,
        'start': start_pt,
        'end': end_pt,
        'mid': mid_pt,
        'length': length
    })

print(f"Parsed {len(parsed)} paths.")
# Categorize paths into writing phases:
# Phase 1: Vertical main stem (x around 150-190, y spanning from 60 to 560)
# Phase 2: Top loop and big outer flourish (y < 200, or x < 150 outer curve)
# Phase 3: Cross bar / diagonal
# Phase 4: Cursive 'ahmi' (x > 180, y between 150 and 320)
# Phase 5: Dot on i

for item in parsed:
    # Determine which part it belongs to
    x, y = item['mid']
    print(f"Path {item['idx']}: len={item['length']:.1f}, start=({item['start'][0]:.1f},{item['start'][1]:.1f}), mid=({x:.1f},{y:.1f}), end=({item['end'][0]:.1f},{item['end'][1]:.1f})")
