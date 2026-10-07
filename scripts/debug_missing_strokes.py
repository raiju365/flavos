import json
import xml.etree.ElementTree as ET

with open('scripts/svg_stroke_paths.json', 'r') as f:
    all_28_paths = json.load(f)

with open('scripts/five_strokes.json', 'r') as f:
    five = json.load(f)

print(f"Total paths in svg_stroke_paths.json: {len(all_28_paths)}")

# Let's see which paths in all_28_paths have y < 100
top_paths = []
for idx, p in enumerate(all_28_paths):
    tokens = p.split()
    for i in range(1, len(tokens), 3):
        if tokens[i-1] in ['M', 'L']:
            y = float(tokens[i+1])
            if y < 80:
                top_paths.append((idx, p))
                break

print(f"Paths in upper loop (y < 80): {len(top_paths)}")
for idx, p in top_paths:
    print(f"Path {idx}: starts with {p[:60]}...")
