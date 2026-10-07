import numpy as np
from PIL import Image

def zhang_suen_thinning(image):
    # image: binary numpy array (True for foreground, False for background)
    img = image.copy().astype(np.uint8)
    h, w = img.shape
    changed = True
    
    while changed:
        changed = False
        # Step 1
        to_remove = []
        for r in range(1, h - 1):
            for c in range(1, w - 1):
                if img[r, c] == 0:
                    continue
                # 8 neighbors
                # P9 P2 P3
                # P8 P1 P4
                # P7 P6 P5
                p2 = img[r-1, c]
                p3 = img[r-1, c+1]
                p4 = img[r, c+1]
                p5 = img[r+1, c+1]
                p6 = img[r+1, c]
                p7 = img[r+1, c-1]
                p8 = img[r, c-1]
                p9 = img[r-1, c-1]
                
                neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
                b = sum(neighbors)
                if 2 <= b <= 6:
                    # Number of 0 -> 1 transitions
                    transitions = 0
                    for i in range(8):
                        if neighbors[i] == 0 and neighbors[(i+1)%8] == 1:
                            transitions += 1
                    if transitions == 1:
                        if p2 * p4 * p6 == 0 and p4 * p6 * p8 == 0:
                            to_remove.append((r, c))
        if to_remove:
            changed = True
            for r, c in to_remove:
                img[r, c] = 0
                
        # Step 2
        to_remove = []
        for r in range(1, h - 1):
            for c in range(1, w - 1):
                if img[r, c] == 0:
                    continue
                p2 = img[r-1, c]
                p3 = img[r-1, c+1]
                p4 = img[r, c+1]
                p5 = img[r+1, c+1]
                p6 = img[r+1, c]
                p7 = img[r+1, c-1]
                p8 = img[r, c-1]
                p9 = img[r-1, c-1]
                
                neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
                b = sum(neighbors)
                if 2 <= b <= 6:
                    transitions = 0
                    for i in range(8):
                        if neighbors[i] == 0 and neighbors[(i+1)%8] == 1:
                            transitions += 1
                    if transitions == 1:
                        if p2 * p4 * p8 == 0 and p2 * p6 * p8 == 0:
                            to_remove.append((r, c))
        if to_remove:
            changed = True
            for r, c in to_remove:
                img[r, c] = 0
                
    return img

print("Thinning defined successfully.")
