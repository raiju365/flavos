import subprocess
import os

def test_svg(view_size, r, font_size, letter_spacing, text_content):
    C = 2 * 3.14159265 * r
    html = f"""<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {{
    font-family: 'Elektra Assassin';
    src: url('http://localhost:5174/ELEKTRA_ASSASSIN.ttf') format('truetype');
  }}
  body {{ background: #f5ecd7; margin: 0; padding: 20px; }}
  .circular-text-svg text {{
    font-family: 'Elektra Assassin', serif;
    font-size: {font_size}px;
    letter-spacing: {letter_spacing}px;
    fill: #1a1f5c;
    text-transform: uppercase;
  }}
</style>
</head>
<body>
<div style="position: relative; width: {view_size}px; height: {view_size}px;">
  <!-- Fountain pen cursor centered precisely at vertical midpoint (y = -42.5px) -->
  <img src="http://localhost:5174/cursor.svg" style="position: absolute; left: 50%; top: 50%; width: 32px; height: 85px; margin-left: -16px; margin-top: -42.5px; opacity: 0.9;" />
  <svg class="circular-text-svg" viewBox="0 0 {view_size} {view_size}" width="{view_size}" height="{view_size}">
    <path id="circlePath" d="M {view_size/2}, {view_size/2} m -{r}, 0 a {r},{r} 0 1,1 {r*2},0 a {r},{r} 0 1,1 -{r*2},0" fill="none" stroke="rgba(26,31,92,0.15)"/>
    <text xml:space="preserve">
      <textPath href="#circlePath" startOffset="0%" textLength="326.7" lengthAdjust="spacing">{text_content}</textPath>
    </text>
  </svg>
</div>
</body>
</html>"""

    with open('test_variant.html', 'w', encoding='utf-8') as f:
        f.write(html)
    
    shot_path = r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\9a003369-cff5-496b-a26e-9d704506a38b\scratch\variant_shot.png'
    chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    subprocess.run([chrome, '--headless=new', f'--screenshot={shot_path}', '--window-size=400,400', os.path.abspath('test_variant.html')], capture_output=True)
    print(f"Tested: r={r}, C={C:.1f}")

test_svg(view_size=140, r=52, font_size=10, letter_spacing=2.5, text_content="HOLD TO SKIP&#160;•&#160;HOLD TO SKIP&#160;•&#160;HOLD TO SKIP&#160;•&#160;")
