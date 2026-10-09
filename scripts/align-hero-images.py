from PIL import Image, ImageFilter
import numpy as np

# Read-only registration: find the common central artwork without editing assets.
a = Image.open('public/Sidang Kekaisaran Romawi di Aula Marmer.png').convert('L')
b = Image.open('public/paling-atas.png').convert('L')
factor = 1
a = np.asarray(a.resize((a.width//factor,a.height//factor)), dtype=float)
def features(v):
    return np.diff(v,axis=0)[:,:-1],np.diff(v,axis=1)[:-1,:]
best=(-1,None)
for scale in np.arange(.628,.634,.001):
    small=b.resize((round(b.width*scale/factor),round(b.height*scale/factor)))
    v=np.asarray(small,dtype=float)
    # Exclude borders where the expanded image adds new architecture.
    left,top,right,bottom=round(300*scale/factor),round(220*scale/factor),round(1050*scale/factor),round(850*scale/factor)
    sample=v[top:bottom,left:right]
    bx,by=features(sample)
    for x in range(273,280):
        for y in range(233,240):
            crop=a[y+top:y+bottom,x+left:x+right]
            if crop.shape!=sample.shape:continue
            ax,ay=features(crop)
            score=(np.sum(ax*bx)+np.sum(ay*by))/np.sqrt((np.sum(ax*ax)+np.sum(ay*ay))*(np.sum(bx*bx)+np.sum(by*by)))
            if score>best[0]:best=(float(score),(float(scale),x*factor,y*factor))
print(best)


