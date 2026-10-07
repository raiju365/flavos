import numpy as np
from PIL import Image
import subprocess
import os

# Load sig_shot.png
img = Image.open(r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\sig_shot.png').convert('L')
# Resize to exact viewBox dimensions: 422 x 569
img_resized = img.resize((422, 569), Image.Resampling.LANCZOS)
arr = np.array(img_resized)
binary = (arr < 180) # True for ink, False for background

print(f"Ink pixel count: {np.sum(binary)}")

# Simple morphological thinning using scipy or pure numpy
# We can do 8-neighborhood thinning quickly with numpy vectorized operations!
def fast_thinning(binary_img):
    # vectorized morphological thinning
    img = binary_img.copy().astype(np.uint8)
    
    # 8-connectivity lookup table or fast iteration
    changed = True
    iteration = 0
    while changed and iteration < 60:
        iteration += 1
        changed = False
        for step in [1, 2]:
            # pad image
            p = np.pad(img, 1, mode='constant')
            p2 = p[:-2, 1:-1]
            p3 = p[:-2, 2:]
            p4 = p[1:-1, 2:]
            p5 = p[2:, 2:]
            p6 = p[2:, 1:-1]
            p7 = p[2:, :-2]
            p8 = p[1:-1, :-2]
            p9 = p[:-2, :-2]
            
            # neighbors sum
            b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
            
            # transitions 0 -> 1 in [p2, p3, p4, p5, p6, p7, p8, p9, p2]
            t = ((p2 == 0) & (p3 == 1)).astype(int) + \
                ((p3 == 0) & (p4 == 1)).astype(int) + \
                ((p4 == 0) & (p5 == 1)).astype(int) + \
                ((p5 == 0) & (p6 == 1)).astype(int) + \
                ((p6 == 0) & (p7 == 1)).astype(int) + \
                ((p7 == 0) & (p8 == 1)).astype(int) + \
                ((p8 == 0) & (p9 == 1)).astype(int) + \
                ((p9 == 0) & (p2 == 1)).astype(int)
                
            cond1 = (img == 1)
            cond2 = (b >= 2) & (b <= 6)
            cond3 = (t == 1)
            
            if step == 1:
                cond4 = (p2 * p4 * p6 == 0)
                cond5 = (p4 * p6 * p8 == 0)
            else:
                cond4 = (p2 * p4 * p8 == 0)
                cond5 = (p2 * p6 * p8 == 0)
                
            del_mask = cond1 & cond2 & cond3 & cond4 & cond5
            n_del = np.sum(del_mask)
            if n_del > 0:
                img[del_mask] = 0
                changed = True
                
    return img

skeleton = fast_thinning(binary)
print(f"Skeleton pixel count: {np.sum(skeleton)}")
# Save skeleton visualization
skel_img = Image.fromarray((1 - skeleton) * 255).convert('RGB')
skel_img.save(r'C:\Users\Fahmi Aufa\.gemini\antigravity-ide\brain\ebe4dcc4-b662-445c-a6d7-80287a19cf9f\skeleton.png')
print("Saved skeleton.png")
