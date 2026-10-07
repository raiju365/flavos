import subprocess
import os

html_template = """<!DOCTYPE html>
<html>
<head>
<style>
  body {{ margin: 0; background: #151613; display: flex; justify-content: center; align-items: center; height: 100vh; }}
  .card {{ width: 400px; height: 500px; background: #dbe1bc; position: relative; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; }}
  .sig-svg {{ width: 320px; height: 430px; }}
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
  <svg class="sig-svg" viewBox="0 0 422 570" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="sig-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="522" height="670">
        <rect width="100%" height="100%" fill="black"/>
        <path class="mask-stroke" id="p1" d="{stroke_d}" />
      </mask>
    </defs>
    <g mask="url(#sig-mask)">
      <path fill="#151613" d="{orig_d1}" />
      <path fill="#151613" d="{orig_d2}" />
    </g>
  </svg>
</div>
<script>
  const p = document.getElementById('p1');
  const len = p.getTotalLength();
  p.style.strokeDasharray = len;
  p.style.strokeDashoffset = len * (1 - {progress});
</script>
</body>
</html>
"""

# Let's read the original paths from public/signature.svg
import xml.etree.ElementTree as ET
tree = ET.parse('public/signature.svg')
root = tree.getroot()
paths = [e.attrib['d'] for e in root.iter() if e.tag.endswith('path') and 'd' in e.attrib]

print(f"Loaded {len(paths)} paths from signature.svg")
