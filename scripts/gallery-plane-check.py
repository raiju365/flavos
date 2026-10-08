"""Check rendered CSS card rectangles for actual 3D plane intersections."""
import json
from pathlib import Path

def sub(a,b): return [x-y for x,y in zip(a,b)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def rect(card):
    m=card['matrix']; u=m[:3]; v=m[4:7]; p=m[12:15]; h=card['size']/2
    return dict(p=p,u=u,v=v,n=cross(u,v),h=h,corners=[
        [p[k]+i*h*u[k]+j*h*v[k] for k in range(3)]
        for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]])
def cuts(a,b):
    for x,y in zip(a['corners'],a['corners'][1:]+a['corners'][:1]):
        delta=sub(y,x); denominator=dot(delta,b['n'])
        if abs(denominator)<1e-7: continue
        t=dot(sub(b['p'],x),b['n'])/denominator
        if not .001<t<.999: continue
        hit=sub([x[k]+t*delta[k] for k in range(3)],b['p'])
        if (abs(dot(hit,b['u'])/dot(b['u'],b['u']))<b['h']-.5
            and abs(dot(hit,b['v'])/dot(b['v'],b['v']))<b['h']-.5): return True
    return False

data=json.loads(Path('artifacts/gallery-stagger-qa.json').read_text())
failures=[]
for result in data['results']:
    hits=[]
    for state in result['states']:
        cards=[(i,rect(card)) for i,card in enumerate(state['cards']) if card['visible']]
        for index,(i,a) in enumerate(cards):
            for j,b in cards[index+1:]:
                if cuts(a,b) or cuts(b,a): hits.append((state['p'],i,j))
    print(result['width'], 'plane intersections:', hits)
    failures.extend(hits)
assert not failures, failures
