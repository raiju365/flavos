import json
import numpy as np

with open('scripts/chained_stroke_paths.json', 'r') as f:
    chains = json.load(f)

# Parse each chain into points
parsed_chains = []
for idx, c in enumerate(chains):
    tokens = c.split()
    pts = []
    i = 0
    while i < len(tokens):
        if tokens[i] in ['M', 'L']:
            pts.append([float(tokens[i+1]), float(tokens[i+2])])
            i += 3
        else:
            i += 1
    pts = np.array(pts)
    parsed_chains.append(pts)

# Chains:
# Chain 0: [417.0, 90.0] -> [302.0, 203.0] (top loop & flourish)
# Chain 1: [189.0, 183.0] -> [207.0, 254.0] (h loop)
# Chain 2: [34.0, 356.0] -> [87.0, 560.0] (outer flourish tail)
# Chain 3: [151.0, 62.0] -> [214.0, 161.0] (upper vertical stem)
# Chain 4: [253.0, 290.0] -> [249.0, 234.0] (m/i cursive)
# Chain 5: [182.0, 282.0] -> [124.0, 324.0] (cross / diagonal)
# Chain 6: [185.0, 341.0] -> [156.0, 326.0] (cross connector)
# Chain 7: [146.0, 365.0] -> [189.0, 567.0] (lower vertical stem)
# Chain 8: [115.0, 231.0] -> [67.0, 277.0] (middle flourish / cross)
# Chain 9: [288.0, 278.0] -> [284.0, 307.0] (i tail)
# Chain 10: [295.0, 247.0] -> [302.0, 247.0] (dot on i)

# Let's combine them into:
# Stroke 1: Main Vertical Stem: Chain 3 + Chain 7
# (connect (214, 161) to (146, 365))
stem_pts = np.vstack([parsed_chains[3], parsed_chains[7]])

# Stroke 2: Big Top Loop and Outer Flourish: Chain 0 + Chain 2
# Top loop from (150, 160) up to top (310, 8), down to arrow (12, 340), down to tail (87, 560)
flourish_pts = np.vstack([parsed_chains[0], parsed_chains[2]])

# Stroke 3: Crossbar / Diagonal: Chain 8 + Chain 5 + Chain 6
cross_pts = np.vstack([parsed_chains[8], parsed_chains[5], parsed_chains[6]])

# Stroke 4: Cursive 'ahmi': Chain 1 + Chain 4 + Chain 9
cursive_pts = np.vstack([parsed_chains[1], parsed_chains[4], parsed_chains[9]])

# Stroke 5: Dot on i: Chain 10
dot_pts = parsed_chains[10]

def to_d(pts):
    return f"M {pts[0][0]:.1f} {pts[0][1]:.1f} " + " ".join(f"L {p[0]:.1f} {p[1]:.1f}" for p in pts[1:])

strokes = {
    'stem': to_d(stem_pts),
    'flourish': to_d(flourish_pts),
    'cross': to_d(cross_pts),
    'cursive': to_d(cursive_pts),
    'dot': to_d(dot_pts)
}

with open('scripts/five_strokes.json', 'w') as f:
    json.dump(strokes, f, indent=2)

print("Created five_strokes.json successfully!")
