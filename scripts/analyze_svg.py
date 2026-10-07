import re

with open('public/signature.svg', 'r', encoding='utf-8') as f:
    text = f.read()

paths = re.findall(r'd="([^"]+)"', text)
print("Number of path elements:", len(paths))
for idx, p in enumerate(paths):
    # Count how many M or m commands
    m_matches = list(re.finditer(r'[Mm]', p))
    print(f"Path {idx}: length {len(p)} chars, {len(m_matches)} M/m subpaths")
