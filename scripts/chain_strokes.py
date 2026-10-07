import json
import numpy as np

with open('scripts/svg_stroke_paths.json', 'r') as f:
    mask_paths = json.load(f)

# Parse paths
paths = []
for p in mask_paths:
    tokens = p.split()
    pts = []
    i = 0
    while i < len(tokens):
        if tokens[i] in ['M', 'L']:
            pts.append([float(tokens[i+1]), float(tokens[i+2])])
            i += 3
        else:
            i += 1
    paths.append(pts)

# Greedy chaining of paths
chains = []
used = [False] * len(paths)

# Helper to find nearest connection
while not all(used):
    # Pick longest unused path as seed
    unused_indices = [i for i in range(len(paths)) if not used[i]]
    lengths = [len(paths[i]) for i in unused_indices]
    seed_idx = unused_indices[np.argmax(lengths)]
    
    chain = list(paths[seed_idx])
    used[seed_idx] = True
    
    extended = True
    while extended:
        extended = False
        chain_start = np.array(chain[0])
        chain_end = np.array(chain[-1])
        
        best_dist = 25.0 # max gap to bridge
        best_idx = None
        best_mode = None
        
        for i in range(len(paths)):
            if used[i]: continue
            p_start = np.array(paths[i][0])
            p_end = np.array(paths[i][-1])
            
            # end -> start
            d = np.linalg.norm(chain_end - p_start)
            if d < best_dist:
                best_dist = d
                best_idx = i
                best_mode = 'end-start'
                
            # end -> end (reverse)
            d = np.linalg.norm(chain_end - p_end)
            if d < best_dist:
                best_dist = d
                best_idx = i
                best_mode = 'end-end'
                
            # start -> end (prepend)
            d = np.linalg.norm(chain_start - p_end)
            if d < best_dist:
                best_dist = d
                best_idx = i
                best_mode = 'start-end'
                
            # start -> start (prepend reversed)
            d = np.linalg.norm(chain_start - p_start)
            if d < best_dist:
                best_dist = d
                best_idx = i
                best_mode = 'start-start'
                
        if best_idx is not None:
            used[best_idx] = True
            extended = True
            p = paths[best_idx]
            if best_mode == 'end-start':
                chain.extend(p)
            elif best_mode == 'end-end':
                chain.extend(reversed(p))
            elif best_mode == 'start-end':
                chain = list(p) + chain
            elif best_mode == 'start-start':
                chain = list(reversed(p)) + chain
                
    chains.append(chain)

print(f"Chained {len(paths)} paths into {len(chains)} continuous chains!")
for i, c in enumerate(chains):
    print(f"Chain {i}: {len(c)} points, start={c[0]}, end={c[-1]}")

# Also add the dot on the 'i'
# 'i' dot is at (299, 247)
chains.append([[295.0, 247.0], [302.0, 247.0]])

# Save chained SVG path strings
chained_svg_d = []
for c in chains:
    d = f"M {c[0][0]:.1f} {c[0][1]:.1f} " + " ".join(f"L {p[0]:.1f} {p[1]:.1f}" for p in c[1:])
    chained_svg_d.append(d)

with open('scripts/chained_stroke_paths.json', 'w') as f:
    json.dump(chained_svg_d, f)
