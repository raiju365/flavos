import json
import xml.etree.ElementTree as ET
import subprocess
import os

with open('scripts/svg_stroke_paths.json', 'r') as f:
    mask_paths = json.load(f)

tree = ET.parse('public/signature.svg')
root = tree.getroot()
orig_paths = [e.attrib['d'] for e in root.iter() if e.tag.endswith('path') and 'd' in e.attrib]

# Build mask strokes
mask_strokes_html = "\n".join([f'<path d="{d}" />' for d in mask_paths])

html = f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ margin: 0; background: #151613; display: flex; justify-content: center; align-items: center; height: 100vh; }}
  .card {{ width: 420px; height: 570px; background: #dbe1bc; position: relative; display: flex; align-items: center; justify-content: center; }}
  svg {{ width: 380px; height: 510px; }}
  .mask-stroke {{
    fill: none;
    stroke: white;
    stroke-width: 26px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }}
</style>
</head>
<body>
<div class="card">
  <svg viewBox="0 0 422 570" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="sig-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="522" height="670">
        <rect x="-50" y="-50" width="522" height="670" fill="black"/>
        <g class="mask-stroke">
          {mask_strokes_html}
        </g>
      </mask>
    </defs>
    <g mask="url(#sig-mask)">
      <path fill="#151613" d="{orig_paths[0]}" />
      <path fill="#151613" d="{orig_paths[1]}" />
    </g>
  </svg>
</div>
</body>
</html>
"""

with open('scripts/test_coverage.html', 'w', encoding='utf-8') as f:
    f.write(html)

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
shot = r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\coverage_100.png'
subprocess.run([chrome, '--headless=new', f'--screenshot={shot}', '--window-size=600,700', os.path.abspath('scripts/test_coverage.html')])
print("Coverage test complete, saved coverage_100.png")
