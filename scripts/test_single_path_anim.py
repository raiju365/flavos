import json
import subprocess
import os

with open('scripts/chained_stroke_paths.json', 'r') as f:
    chains = json.load(f)

# Sort chains in writing order:
# Let's order them:
# 1. Main vertical stem (Chain 3, Chain 7)
# 2. Big flourish (Chain 0, Chain 2)
# 3. Cross and cursive letters (Chain 8, Chain 5, Chain 6, Chain 1, Chain 4, Chain 9)
# 4. Dot on i (Chain 10)

combined_d = " ".join(chains)

import xml.etree.ElementTree as ET
tree = ET.parse('public/signature.svg')
root = tree.getroot()
orig_paths = [e.attrib['d'] for e in root.iter() if e.tag.endswith('path') and 'd' in e.attrib]

for progress in [0.25, 0.5, 0.75, 1.0]:
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
    stroke-width: 28px;
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
        <path class="mask-stroke" id="mask-path" d="{combined_d}" />
      </mask>
    </defs>
    <g mask="url(#sig-mask)">
      <path fill="#151613" d="{orig_paths[0]}" />
      <path fill="#151613" d="{orig_paths[1]}" />
    </g>
  </svg>
</div>
<script>
  const p = document.getElementById('mask-path');
  const len = p.getTotalLength();
  p.style.strokeDasharray = len;
  p.style.strokeDashoffset = len * (1 - {progress});
</script>
</body>
</html>
"""
    with open(f'scripts/test_anim_{int(progress*100)}.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    shot = rf'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\anim_{int(progress*100)}.png'
    subprocess.run([chrome, '--headless=new', f'--screenshot={shot}', '--window-size=600,700', os.path.abspath(f'scripts/test_anim_{int(progress*100)}.html')])

print("Generated animation frames at 25%, 50%, 75%, 100%")
