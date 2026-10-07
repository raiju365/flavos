import numpy as np
from PIL import Image
import json

# Let's write a function to simplify a list of points (Ramer-Douglas-Peucker)
def rdp(points, epsilon=1.0):
    if len(points) < 3:
        return points
    # line between first and last
    p1 = np.array(points[0])
    p2 = np.array(points[-1])
    d = np.linalg.norm(p2 - p1)
    if d == 0:
        dist = np.linalg.norm(points - p1, axis=1)
    else:
        dist = np.abs(np.cross(p2 - p1, points - p1)) / d
        
    idx = np.argmax(dist)
    max_d = dist[idx]
    
    if max_d > epsilon:
        left = rdp(points[:idx+1], epsilon)
        right = rdp(points[idx:], epsilon)
        return left[:-1] + right
    else:
        return [points[0], points[-1]]

# Load branches from previous step
# Let's run a clean branch extraction and connect matching endpoints!
skel_img = Image.open(r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\skeleton.png').convert('L')
arr = (np.array(skel_img) < 128).astype(np.uint8)
h, w = arr.shape

unvisited = (arr == 1).copy()
branches = []

while np.any(unvisited):
    pts = np.argwhere(unvisited)
    # pick a point
    curr = pts[0]
    branch = [curr]
    unvisited[curr[0], curr[1]] = False
    
    # expand forward
    while True:
        r, c = branch[-1]
        neighbors = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0: continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and unvisited[nr, nc]:
                    neighbors.append((nr, nc))
        if not neighbors:
            break
        curr = neighbors[0]
        branch.append(curr)
        unvisited[curr[0], curr[1]] = False
        
    # expand backward from branch[0]
    while True:
        r, c = branch[0]
        neighbors = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0: continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and unvisited[nr, nc]:
                    neighbors.append((nr, nc))
        if not neighbors:
            break
        curr = neighbors[0]
        branch.insert(0, curr)
        unvisited[curr[0], curr[1]] = False
        
    if len(branch) > 3:
        branches.append(branch)

# Convert each branch: point is (row, col) = (y, x) -> SVG coordinate (x, y)
svg_paths = []
for b in branches:
    pts = [[float(p[1]), float(p[0])] for p in b]
    simplified = rdp(pts, epsilon=1.2)
    # create d string
    d = f"M {simplified[0][0]:.1f} {simplified[0][1]:.1f} " + " ".join(f"L {p[0]:.1f} {p[1]:.1f}" for p in simplified[1:])
    svg_paths.append(d)

print(f"Generated {len(svg_paths)} SVG stroke paths")
with open('scripts/svg_stroke_paths.json', 'w') as f:
    json.dump(svg_paths, f)
