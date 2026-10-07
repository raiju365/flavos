import json
import xml.etree.ElementTree as ET
import subprocess
import os

with open('scripts/orig_paths.json', 'r') as f:
    orig_paths = json.load(f)

with open('scripts/five_strokes.json', 'r') as f:
    strokes = json.load(f)

# Read logo.svg
with open('public/logo.svg', 'r', encoding='utf-8') as f:
    logo_svg = f.read()

def make_html(sig_style, logo_style, title):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 0; background: #151613; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; color: #f0eee7; }}
  h2 {{ margin-bottom: 20px; font-size: 18px; letter-spacing: 0.1em; }}
  .card {{
    width: 540px;
    height: 482px;
    background: #dbe1bc;
    position: relative;
    border-radius: 0;
    box-shadow: 0 18px 40px rgba(0,0,0,0.3);
    overflow: hidden;
    transform: rotate(6deg);
  }}
  .footer-card-logo {{
    position: absolute;
    {logo_style}
  }}
  .footer-card-signature {{
    position: absolute;
    {sig_style}
    pointer-events: none;
  }}
  .footer-card-signature svg {{
    width: 100%;
    height: 100%;
    display: block;
  }}
  .footer-flip-label {{
    position: absolute;
    right: 28px;
    bottom: 22px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: #25271e;
  }}
  .mask-stroke {{
    fill: none;
    stroke: white;
    stroke-width: 30px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }}
</style>
</head>
<body>
<h2>{title}</h2>
<div class="card">
  <img class="footer-card-logo" src="/logo.svg" />
  <div class="footer-card-signature">
    <svg viewBox="0 0 422 570" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="mask1" maskUnits="userSpaceOnUse" x="-50" y="-50" width="522" height="670">
          <rect x="-50" y="-50" width="522" height="670" fill="black"/>
          <g class="mask-stroke">
            <path d="{strokes['stem']}" />
            <path d="{strokes['flourish']}" />
            <path d="{strokes['cross']}" />
            <path d="{strokes['cursive']}" />
            <path d="{strokes['dot']}" stroke-width="36" />
          </g>
        </mask>
      </defs>
      <g mask="url(#mask1)">
        <path fill="#25271e" d="{orig_paths[0]}" />
        <path fill="#25271e" d="{orig_paths[1]}" />
      </g>
    </svg>
  </div>
  <div class="footer-flip-label">FLIP ME ↗</div>
</div>
</body>
</html>
"""

variations = [
    # Var 1: Signature centered and overlapping emblem (classic artist signature over seal)
    (
        "top: 50%; left: 50%; width: 280px; height: 378px; transform: translate(-50%, -50%) rotate(-4deg); opacity: 0.95;",
        "top: 50%; left: 50%; width: 175px; height: auto; transform: translate(-50%, -50%); opacity: 0.25;",
        "Var 1: Signature over subtle seal watermark"
    ),
    # Var 2: Emblem remains strong in center, signature signs across lower-right/bottom
    (
        "bottom: 24px; left: 36px; width: 220px; height: 297px; transform: rotate(-5deg); z-index: 2;",
        "top: 46%; left: 52%; width: 175px; height: auto; transform: translate(-50%, -50%); opacity: 1;",
        "Var 2: Signature signed at bottom-left across paper"
    ),
    # Var 3: Signature signed boldly across center, emblem prominent
    (
        "top: 52%; left: 50%; width: 310px; height: 418px; transform: translate(-48%, -50%) rotate(-3deg); z-index: 2;",
        "top: 50%; left: 50%; width: 180px; height: auto; transform: translate(-50%, -50%); opacity: 0.9;",
        "Var 3: Signature layered over emblem"
    )
]

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

for i, (sig_css, logo_css, title) in enumerate(variations):
    fname = f'scripts/var_{i+1}.html'
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(make_html(sig_css, logo_css, title))
    shot = rf'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\var_{i+1}.png'
    subprocess.run([chrome, '--headless=new', f'--screenshot={shot}', '--window-size=700,750', os.path.abspath(fname)])

print("Variations rendered!")
