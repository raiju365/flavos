import json
import numpy as np
import xml.etree.ElementTree as ET
import subprocess
import os

with open('scripts/svg_stroke_paths.json', 'r') as f:
    all_paths = json.load(f)

# Let's inspect each path's bounding box and center
path_info = []
for idx, p in enumerate(all_paths):
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
    min_xy = pts.min(axis=0)
    max_xy = pts.max(axis=0)
    mid_xy = pts.mean(axis=0)
    path_info.append({
        'idx': idx,
        'd': p,
        'pts': pts,
        'min': min_xy,
        'max': max_xy,
        'mid': mid_xy,
        'len': np.sum(np.linalg.norm(pts[1:] - pts[:-1], axis=1))
    })

# Partition into 4 main groups:
# 1. STEM: vertical line through center (x around 140..195, y spanning from 50 to 570)
# 2. FLOURISH: top loop (y < 100), outer left curve (x < 130), bottom-left curve
# 3. CROSS: diagonal cross through middle
# 4. CURSIVE: 'ahmi' letters (x > 175, y around 160..320)
# 5. DOT: dot on 'i'

stem_indices = []
flourish_indices = []
cross_indices = []
cursive_indices = []

for item in path_info:
    idx = item['idx']
    mid_x, mid_y = item['mid']
    min_x, min_y = item['min']
    max_x, max_y = item['max']
    
    # Stem paths: tightly aligned vertically around x=140..200 and extending vertically
    if (145 <= mid_x <= 195) and (max_y - min_y > 80 or mid_y > 360 or (mid_y < 160 and mid_x < 175)):
        stem_indices.append(idx)
    elif mid_y < 120 or min_x < 120 or (mid_y > 340 and mid_x < 140):
        flourish_indices.append(idx)
    elif mid_x > 185 and 160 <= mid_y <= 320:
        cursive_indices.append(idx)
    else:
        cross_indices.append(idx)

# Make sure all 28 are covered
all_assigned = set(stem_indices + flourish_indices + cross_indices + cursive_indices)
assert len(all_assigned) == len(all_paths), f"Missing paths: {set(range(len(all_paths))) - all_assigned}"

print(f"Stem: {len(stem_indices)} paths: {stem_indices}")
print(f"Flourish: {len(flourish_indices)} paths: {flourish_indices}")
print(f"Cross: {len(cross_indices)} paths: {cross_indices}")
print(f"Cursive: {len(cursive_indices)} paths: {cursive_indices}")

# Build path strings for each group
def make_d(indices):
    return " ".join(all_paths[i] for i in indices)

strokes = {
    'stem': make_d(stem_indices),
    'flourish': make_d(flourish_indices),
    'cross': make_d(cross_indices),
    'cursive': make_d(cursive_indices),
    'dot': "M 294.0 247.0 L 302.0 247.0"
}

with open('scripts/perfect_5_strokes.json', 'w') as f:
    json.dump(strokes, f, indent=2)

# Test coverage with all 5 strokes combined
tree = ET.parse('public/signature.svg')
root = tree.getroot()
orig_paths = [e.attrib['d'] for e in root.iter() if e.tag.endswith('path') and 'd' in e.attrib]

html = f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ margin: 0; background: #151613; display: flex; justify-content: center; align-items: center; height: 100vh; }}
  .card {{ width: 540px; height: 482px; background: #dbe1bc; position: relative; display: flex; align-items: center; justify-content: center; transform: rotate(6deg); }}
  svg {{ width: 330px; height: 445px; }}
  .mask-stroke {{
    fill: none;
    stroke: white;
    stroke-width: 32px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }}
</style>
</head>
<body>
<div class="card">
  <svg viewBox="0 0 422 570" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="perfect-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="522" height="670">
        <rect x="-50" y="-50" width="522" height="670" fill="black"/>
        <g class="mask-stroke">
          <path id="stem" d="{strokes['stem']}" />
          <path id="flourish" d="{strokes['flourish']}" />
          <path id="cross" d="{strokes['cross']}" />
          <path id="cursive" d="{strokes['cursive']}" />
          <path id="dot" d="{strokes['dot']}" stroke-width="38" />
        </g>
      </mask>
    </defs>
    <g mask="url(#perfect-mask)">
      <path fill="#25271e" d="{orig_paths[0]}" />
      <path fill="#25271e" d="{orig_paths[1]}" />
    </g>
  </svg>
</div>
</body>
</html>
"""

with open('scripts/test_perfect_coverage.html', 'w', encoding='utf-8') as f:
    f.write(html)

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
shot = r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\perfect_coverage.png'
subprocess.run([chrome, '--headless=new', f'--screenshot={shot}', '--window-size=700,750', os.path.abspath('scripts/test_perfect_coverage.html')])
print("Perfect coverage screenshot saved!")
