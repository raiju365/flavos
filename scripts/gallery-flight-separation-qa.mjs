import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getGalleryFlightLayout } from '../src/gallery-flight-layout.js';
import { galleryWorks } from '../src/project-gallery-data.js';

const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { const t = clamp(v); return t ** 3 * (t * (t * 6 - 15) + 10); };
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
// Independent segment/plane oracle checks the actual artwork rectangles.
function rectangle(p, size) {
  const rotate = ([x, y, z]) => {
    [x, y] = [x * Math.cos(p.bank) - y * Math.sin(p.bank), x * Math.sin(p.bank) + y * Math.cos(p.bank)];
    [y, z] = [y * Math.cos(p.pitch) - z * Math.sin(p.pitch), y * Math.sin(p.pitch) + z * Math.cos(p.pitch)];
    return [x * Math.cos(p.yaw) + z * Math.sin(p.yaw), y, -x * Math.sin(p.yaw) + z * Math.cos(p.yaw)];
  };
  const u = rotate([1,0,0]), v = rotate([0,1,0]), center = [p.x,p.y,p.z], h = size * p.scale / 2;
  return { center, u, v, n: cross(u,v), h, corners: [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => center.map((c,k) => c + h*a*u[k] + h*b*v[k])) };
}
function cuts(a,b) {
  return a.corners.some((x,i) => {
    const delta = sub(a.corners[(i+1)%4],x), denominator = dot(delta,b.n);
    if (Math.abs(denominator)<1e-9) return false;
    const t = dot(sub(b.center,x),b.n)/denominator;
    if (t<=0.00001 || t>=0.99999) return false;
    const hit = sub(x.map((v,k)=>v+t*delta[k]),b.center);
    return Math.abs(dot(hit,b.u))<b.h-0.01 && Math.abs(dot(hit,b.v))<b.h-0.01;
  });
}
function intersections(poses,size) {
  const boxes=poses.filter(p=>p.progress>0).map(p=>rectangle(p,size)); let total=0;
  boxes.forEach((a,i)=>boxes.slice(i+1).forEach(b=>{ if(cuts(a,b)||cuts(b,a)) total++; }));
  return total;
}
const results=[];
for(const [width,height] of [[1792,948],[1440,900],[1280,720],[820,1000],[390,844],[320,715]]) {
  const desktop=width>=1200, count=galleryWorks.length;
  const size=Math.min(475,Math.max(287.5,width*.31875),height*(height<600?.425:.475),width*.8);
  const gap=size*.55, radius=(size+gap)/(2*Math.tan(Math.PI/count));
  let before=0,after=0,maximumStep=0,maximumTurn=0,minimumClearance=Infinity,states=0,layoutMs=0,previous,previousPoses;
  for(const angle of [0,.55,1.7,3.6]) for(let s=1;s<=400;s++) {
    const emergence=s/400, descent=ease(emergence), initialScale=Math.min(.72,width*.32*.64/size);
    const lift=height*1.25*ease(desktop?emergence/.75:(emergence-.42)/.55);
    const landing=height*(desktop?.18:.34)*Math.sin(Math.PI*ease(emergence));
    const original=Array.from({length:count},(_,i)=>{
      const departure=i/(count-1)*.45,progress=clamp((emergence-departure)/(1-departure));
      const opening=ease((progress-.2)/.8),drop=1-(1-clamp(progress/.45))**3;
      const theta=angle+i*Math.PI*2/count+(1-descent)*Math.PI*1.5;
      return {x:Math.sin(theta)*radius*opening,
        y:(-height*.1-lift*(desktop?1-drop:1)+height*(desktop?.32:.55)*drop)*(1-opening)+landing*opening,
        z:(radius-size*1.1*i)*(1-opening)+Math.cos(theta)*radius*opening,
        yaw:theta*opening,pitch:Math.sin(Math.PI*progress)*-.18,bank:Math.sin(Math.PI*progress)*(i%2?.09:-.09),
        scale:Math.min(initialScale+(1-initialScale)*opening,Math.max(initialScale,opening*(1+gap/size)*.9)),progress};
    });
    before+=intersections(original,size);
    const params={progress:emergence,count,angle,radius,size,gap,photoWidth:width*.32,originX:0,originY:-height*.1,portraitLift:lift,landingY:landing,viewportHeight:height,desktop};
    const start=performance.now(); const poses=getGalleryFlightLayout(params); layoutMs+=performance.now()-start;
    after+=intersections(poses,size);
    // A static plane-cut oracle misses parallel sheets passing through one
    // another between samples. Their depth order must remain the destination
    // order throughout departure, including reverse seeks.
    const depthOrder=poses.map((pose,i)=>({pose,i,depth:Math.cos(angle+i*Math.PI*2/count)}))
      .sort((a,b)=>b.depth-a.depth||a.i-b.i);
    for(let i=1;i<depthOrder.length;i++) assert.ok(
      depthOrder[i-1].pose.z>=depthOrder[i].pose.z-1e-8,
      `${width} progress ${emergence}: sheets exchange front/back order`);
    const centers=poses.map(p=>[p.x,p.y,p.z]);
    if(s>1) maximumStep=Math.max(maximumStep,...centers.map((v,i)=>Math.hypot(...sub(v,previous[i]))));
    previous=centers;
    if(s>1) maximumTurn=Math.max(maximumTurn,...poses.map((p,i)=>Math.abs(p.yaw-previousPoses[i].yaw)));
    previousPoses=poses;
    const visible=poses.filter(p=>p.progress>0);
    visible.forEach((a,i)=>visible.slice(i+1).forEach(b=>{
      const air=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-size*(a.scale+b.scale)/Math.SQRT2;
      minimumClearance=Math.min(minimumClearance,air);
    }));
    if(s%40===0) assert.deepEqual(getGalleryFlightLayout(params),poses,'seek/reverse is deterministic');
    if(s===400) poses.forEach((p,i)=>Object.keys(original[i]).forEach(key=>{
      const delta=p[key]-original[i][key];
      assert.ok(Math.abs(key==='yaw'?Math.atan2(Math.sin(delta),Math.cos(delta)):delta)<1e-8,'settled orbit remains unchanged');
    }));
    states++;
  }
  assert.equal(after,0,`${width}: intersecting card planes`);
  // Parallel sheets may overlap in projection during the portrait departure.
  // The rectangle oracle above rejects actual plane cuts, including those
  // between a departing sheet and one that has started turning into the ring.
  assert.ok(maximumStep<size*.15,'no abrupt displacement between neighbouring scroll samples');
  assert.ok(maximumTurn<.075,'rotation must stay below 4.3 degrees per quarter-percent scroll step');
  results.push({width,height,states,before,after,minimumClearance,maximumStep,maximumTurn,meanLayoutMs:layoutMs/states});
}
assert.ok(results.some(r=>r.before>0),'oracle must reproduce the original intersections');
await writeFile('artifacts/gallery-flight-separation-qa.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
