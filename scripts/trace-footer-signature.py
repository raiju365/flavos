import cv2, json
im=cv2.imread('public/footer/FlavoSs.png',cv2.IMREAD_UNCHANGED)
print(im.shape)
alpha=im[:,:,3] if im.shape[2]==4 else 255-cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
_,mask=cv2.threshold(alpha,100,255,cv2.THRESH_BINARY)
contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
shapes=[]
for i,c in enumerate(contours):
 if hierarchy[0][i][3]!=-1 or cv2.contourArea(c)<12: continue
 def points(c): return cv2.approxPolyDP(c,.7,True).reshape(-1,2).tolist()
 holes=[];child=hierarchy[0][i][2]
 while child!=-1:
  if cv2.contourArea(contours[child])>5: holes.append(points(contours[child]))
  child=hierarchy[0][child][0]
 shapes.append({'points':points(c),'holes':holes})
with open('src/footer-signature-shapes.json','w') as f:json.dump({'width':im.shape[1],'height':im.shape[0],'shapes':shapes},f,separators=(',',':'))
print('shapes',len(shapes),'points',sum(len(s['points']) for s in shapes))
