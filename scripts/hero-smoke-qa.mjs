import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const b=await chromium.launch({channel:'msedge',headless:true});const errors=[],result={};
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});await p.waitForTimeout(1200);
 const read=()=>p.evaluate(()=>{
   const c=document.querySelector('.hero-aperture');c.dispatchEvent(new Event('aperture-restored'));const gl=c.getContext('webgl');
   const x=Math.round(100*c.width/innerWidth),y=Math.round(250*c.height/innerHeight),w=Math.round(240*c.width/innerWidth),h=Math.round(380*c.height/innerHeight);
   const pixels=new Uint8Array(w*h*4);gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let ink=0;for(let i=0;i<pixels.length;i+=4)ink+=255-pixels[i];
   return {ink:ink/(w*h),trail:c.dataset.trailState,overflow:document.documentElement.scrollWidth-innerWidth};
 });
 result.before=await read();await p.mouse.move(120,330);
 for(let i=0;i<35;i++){await p.mouse.move(130+i*5,420+Math.sin(i*.2)*65);await p.waitForTimeout(20);}
 await p.waitForTimeout(160);result.active=await read();await p.screenshot({path:'artifacts/hero-smoke-active.png'});
 // Leaving preserves the wake; no straight connection when re-entering.
 await p.locator('#hero').dispatchEvent('pointerleave');await p.waitForTimeout(650);result.lingering=await read();await p.screenshot({path:'artifacts/hero-smoke-lingering.png'});
 await p.waitForTimeout(3100);result.settled=await read();
 assert.ok(result.active.ink>result.before.ink+.2,JSON.stringify(result));assert.ok(result.lingering.ink>result.before.ink+.02);
 assert.ok(result.settled.ink<result.before.ink+.01);assert.equal(result.settled.trail,'idle');
 await p.emulateMedia({reducedMotion:'reduce'});await p.mouse.move(130,400);await p.mouse.move(290,430,{steps:20});await p.waitForTimeout(200);result.reduced=await read();assert.equal(result.reduced.trail,'idle');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:390,height:844});await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 await p.mouse.move(30,210);await p.mouse.move(340,260,{steps:30});await p.waitForTimeout(200);await p.screenshot({path:'artifacts/hero-smoke-mobile.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await writeFile('artifacts/hero-smoke-qa.json',JSON.stringify({result,errors},null,2));await b.close();}
