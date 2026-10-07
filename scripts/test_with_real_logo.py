import json
import xml.etree.ElementTree as ET
import subprocess
import os

with open('scripts/orig_paths.json', 'r') as f:
    orig_paths = json.load(f)

with open('scripts/five_strokes.json', 'r') as f:
    strokes = json.load(f)

# Read logo.svg content directly
with open('public/logo.svg', 'r', encoding='utf-8') as f:
    logo_content = f.read()

# Let's extract the SVG tag from logo_content or inline it
def make_combo_html(sig_css, logo_css, title):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ margin: 0; background: #151613; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; color: #f0eee7; }}
  h2 {{ margin-bottom: 20px; font-size: 16px; letter-spacing: 0.1em; }}
  .card {{
    width: 540px;
    height: 482px;
    background: #dbe1bc;
    position: relative;
    box-shadow: 0 18px 40px rgba(0,0,0,0.3);
    overflow: hidden;
    transform: rotate(6deg);
  }}
  .logo-box {{
    position: absolute;
    {logo_css}
  }}
  .logo-box svg {{
    width: 100%;
    height: auto;
    display: block;
  }}
  .sig-box {{
    position: absolute;
    {sig_css}
    pointer-events: none;
  }}
  .sig-box svg {{
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
  <div class="logo-box">
    {logo_content}
  </div>
  <div class="sig-box">
    <svg viewBox="0 0 422 570" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="m1" maskUnits="userSpaceOnUse" x="-50" y="-50" width="522" height="670">
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
      <g mask="url(#m1)">
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

# Option A: Signature signed diagonally across the monogram logo (like an autographed print / certificate)
html_a = make_combo_html(
    sig_css="top: 50%; left: 52%; width: 290px; height: 390px; transform: translate(-50%, -50%) rotate(-4deg); z-index: 2;",
    logo_css="top: 50%; left: 50%; width: 175px; transform: translate(-50%, -50%); opacity: 0.85; z-index: 1;",
    title="Option A: Autographed Signature Across Monogram"
)

# Option B: Monogram subtly embossed as watermark, signature bold in center
html_b = make_combo_html(
    sig_css="top: 50%; left: 50%; width: 310px; height: 418px; transform: translate(-50%, -50%) rotate(-2deg); z-index: 2;",
    logo_css="top: 50%; left: 50%; width: 185px; transform: translate(-50%, -50%); opacity: 0.18; z-index: 1;",
    title="Option B: Signature Hero with Watermark Seal"
)

# Option C: Signature replaces the static logo entirely on the front, becoming the hero!
html_c = make_combo_html(
    sig_css="top: 50%; left: 50%; width: 320px; height: 432px; transform: translate(-50%, -50%) rotate(-2deg); z-index: 2;",
    logo_css="display: none;",
    title="Option C: Signature as the Front Hero Piece"
)

with open('scripts/combo_a.html', 'w', encoding='utf-8') as f: f.write(html_a)
with open('scripts/combo_b.html', 'w', encoding='utf-8') as f: f.write(html_b)
with open('scripts/combo_c.html', 'w', encoding='utf-8') as f: f.write(html_c)

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
for opt in ['a', 'b', 'c']:
    shot = rf'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\combo_{opt}.png'
    subprocess.run([chrome, '--headless=new', f'--screenshot={shot}', '--window-size=700,750', os.path.abspath(f'scripts/combo_{opt}.html')])

print("Combo screenshots saved!")
