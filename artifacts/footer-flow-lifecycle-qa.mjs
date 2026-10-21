import assert from 'node:assert/strict';
import {initFooterGradient} from '../src/footer-gradient.js';
const raf=new Map(),events=new Map(),mediaEvents=new Map(),canvasEvents=new Map();
let serial=0,draws=0,programs=0,attached=0,removed=0,intersection,sizing,enabled=true;
const gl={
  createProgram(){programs++;return {};},createShader:()=>({}),getShaderParameter:()=>true,
  getProgramParameter:()=>true,createBuffer:()=>({}),getUniformLocation:(_,name)=>name,
  shaderSource(){},compileShader(){},attachShader(){},bindAttribLocation(){},linkProgram(){},useProgram(){},
  bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},uniform3fv(){},
  uniform2f(){},uniform1f(_,time){assert.ok(Number.isFinite(time));},uniform2fv(_,points){assert.ok([...points].every(Number.isFinite));},
  drawArrays(){draws++;},viewport(){},deleteProgram(){},deleteBuffer(){},deleteShader(){},
};
const canvas={style:{},dataset:{},setAttribute(){},getContext:()=>enabled?gl:null,remove(){removed++;},
  addEventListener:(name,fn)=>canvasEvents.set(name,fn),removeEventListener:name=>canvasEvents.delete(name)};
const footer={clientWidth:1440,clientHeight:900,prepend(){attached++;}};
const motion={matches:false,addEventListener:(name,fn)=>mediaEvents.set(name,fn),removeEventListener:name=>mediaEvents.delete(name)};
globalThis.document={hidden:false,querySelector:()=>footer,createElement:()=>canvas,
  addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
globalThis.matchMedia=()=>motion;
globalThis.getComputedStyle=()=>({getPropertyValue:name=>name==='--folio-ink'?'#20235b':'#f8f7f3'});
globalThis.requestAnimationFrame=fn=>{raf.set(++serial,fn);return serial;};
globalThis.cancelAnimationFrame=id=>raf.delete(id);
globalThis.IntersectionObserver=class{constructor(fn){intersection=fn;}observe(){}disconnect(){}};
globalThis.ResizeObserver=class{constructor(fn){sizing=fn;}observe(){}disconnect(){}};
const step=now=>{const pending=[...raf.values()];raf.clear();pending.forEach(fn=>fn(now));};
const dispose=initFooterGradient();
assert.equal(programs,0,'GPU initializes only when footer enters');
intersection([{isIntersecting:true}]);assert.equal(programs,1);assert.equal(attached,1);
assert.equal(canvas.width,512);assert.equal(canvas.height,320);
step(100);const first=draws;for(let i=1;i<=120;i++)step(100+i*1000/60);
assert.equal(draws-first,120,'one render per scheduled 60Hz frame');
intersection([{isIntersecting:false}]);const stopped=draws;step(2200);assert.equal(draws,stopped);
motion.matches=true;mediaEvents.get('change')();intersection([{isIntersecting:true}]);assert.equal(raf.size,0);
footer.clientWidth=390;footer.clientHeight=844;sizing();assert.equal(canvas.height,512);assert.equal(canvas.width,237);
motion.matches=false;mediaEvents.get('change')();assert.equal(raf.size,1);
document.hidden=true;events.get('visibilitychange')();assert.equal(raf.size,0);
document.hidden=false;events.get('visibilitychange')();assert.equal(raf.size,1);
canvasEvents.get('webglcontextlost')({preventDefault(){}});assert.equal(raf.size,0);assert.equal(canvas.style.visibility,'hidden');
canvasEvents.get('webglcontextrestored')();assert.equal(programs,2);assert.equal(canvas.style.visibility,'');assert.equal(raf.size,1);
dispose();assert.equal(raf.size,0);assert.equal(events.size,0);assert.equal(canvasEvents.size,0);assert.ok(removed>0);
enabled=false;const previousAttached=attached;const disposeFallback=initFooterGradient();intersection([{isIntersecting:true}]);
assert.equal(attached,previousAttached,'unavailable WebGL keeps CSS fallback');assert.equal(raf.size,0);disposeFallback();
console.log('PASS lazy initialization, 60Hz scheduling, offscreen pause, reduced motion, mobile resize, hidden tab, context recovery, disposal and CSS fallback');
