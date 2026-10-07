import numpy as np
from PIL import Image

# Load skeleton
skel_img = Image.open(r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\skeleton.png').convert('L')
arr = (np.array(skel_img) < 128).astype(np.uint8)
h, w = arr.shape

# Let's find connected components and trace branches
# For each pixel, find its 8 neighbors
from collections import deque

visited = np.zeros_like(arr, dtype=bool)

# Find all junction points (degree >= 3) and endpoints (degree == 1)
degrees = np.zeros_like(arr, dtype=int)
for r in range(1, h-1):
    for c in range(1, w-1):
        if arr[r, c]:
            deg = np.sum(arr[r-1:r+2, c-1:c+2]) - 1
            degrees[r, c] = deg

endpoints = np.argwhere((arr == 1) & (degrees == 1))
junctions = np.argwhere((arr == 1) & (degrees >= 3))

print(f"Endpoints count: {len(endpoints)}, Junctions count: {len(junctions)}")

# Let's write a greedy path tracer:
# Start from an endpoint or unvisited pixel, follow neighbors until junction or dead end
paths = []
unvisited = (arr == 1).copy()

# Sort endpoints to prioritize natural writing order
# Natural writing order:
# 1. Top loops / F flourish (starts around y < 200, or main stem)
# 2. Main stem (vertical)
# 3. Cursive letters (middle right)
# 4. Dot on 'i'

# We can find all branches:
branches = []
while np.any(unvisited):
    # pick an endpoint if available, else any unvisited
    ep_unvisited = [p for p in endpoints if unvisited[p[0], p[1]]]
    if ep_unvisited:
        # Pick top-most or left-most
        curr = ep_unvisited[0]
    else:
        pts = np.argwhere(unvisited)
        curr = pts[0]
        
    branch = [tuple(curr)]
    unvisited[curr[0], curr[1]] = False
    
    while True:
        r, c = curr
        # look at 8 neighbors that are unvisited
        neighbors = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and unvisited[nr, nc]:
                    neighbors.append((nr, nc))
        if not neighbors:
            break
        # Pick closest or smoothest continuation
        curr = neighbors[0]
        branch.append(tuple(curr))
        unvisited[curr[0], curr[1]] = False
        
    if len(branch) > 3:
        branches.append(branch)

print(f"Extracted {len(branches)} branches.")
for i, b in enumerate(branches):
    print(f"Branch {i}: {len(b)} points, start={b[0]}, end={b[-1]}")
