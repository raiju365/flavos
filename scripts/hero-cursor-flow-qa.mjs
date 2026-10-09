import {createRequire} from 'node:module';
import {writeFile,rename} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
const sample=p=>p.evaluate(()=>{const c=document.querySelector('.hero-aperture'),h=document.querySelector('#hero');return {...c.dataset,progress:+h.dataset.entryProgress,overflow:document.documentElement.scrollWidth-innerWidth,canvases:document.querySelectorAll('.hero-aperture').length,cursors:document.querySelectorAll('#custom-cursor').length,locked:document.body.style.overflow==='hidden'};});
try{for(const [width,height,mode] of [[1440,900,'mouse'],[820,1000,'mouse'],[390,844,'touch'],[320,700,'touch'],[1440,900,'reduce'],[390,844,'fallback']]){
const context=await browser.newContext({viewport:{width,height},hasTouch:mode==='touch',isMobile:mode==='touch',reducedMotion:mode==='reduce'?'reduce':'no-preference',...(width===1440&&mode==='mouse'?{recordVideo:{dir:'artifacts',size:{width:1440,height:900}}}:{})});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
if(mode==='fallback')await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:get.call(this,type,...args)}});
await p.goto('http://localhost:5173');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await p.waitForTimeout(1100);const idle=await sample(p);
await p.mouse.move(width*.36,height*.32);for(let i=0;i<20;i++){await p.mouse.move(width*(.36+.012*i),height*(.32+.007*i));await p.waitForTimeout(18);}const active=await sample(p);
if(mode==='mouse'){assert.ok(+active.pointerMomentum>.1,JSON.stringify(active));assert.ok(+active.pointerStrength>.5);await p.screenshot({path:`artifacts/hero-cursor-flow-${width}-active.png`});}else if(mode!=='fallback'){assert.equal(+active.pointerStrength,0);assert.equal(+active.pointerMomentum,0);}
await p.waitForTimeout(2000);const settled=await sample(p);if(mode!=='fallback'){assert.equal(settled.trailState,'idle');assert.ok(+settled.pointerMomentum<.001);}
assert.equal(settled.overflow,0);assert.equal(settled.locked,false);assert.equal(settled.canvases,1);assert.equal(settled.cursors,1);
// Re-enter from the other direction, then leave and resize while momentum is live.
if(mode==='mouse'){await p.mouse.move(width*.62,height*.5);await p.mouse.move(width*.4,height*.3,{steps:14});await p.setViewportSize({width:width-40,height});await p.waitForTimeout(300);assert.equal((await sample(p)).overflow,0);await p.setViewportSize({width,height});}
const distance=height*(mode==='reduce'?.7:1.8);for(const progress of [.35,.7,.9,.4,0]){await p.evaluate(y=>scrollTo(0,y),distance*progress);await p.waitForTimeout(progress===.9?1250:180);const s=await sample(p);assert.equal(s.overflow,0);if(progress===.9){assert.equal(await p.locator('.hero-aperture').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await p.locator('.studio-header').evaluate(e=>e.inert),false);}}
await p.screenshot({path:`artifacts/hero-cursor-flow-${width}-${mode}-rest.png`});
results.push({width,height,mode,idle,active,settled});console.log('PASS',width,mode);const video=p.video();await context.close();if(video)await rename(await video.path(),'artifacts/hero-cursor-flow.webm');
}assert.deepEqual(errors,[]);}finally{await writeFile('artifacts/hero-cursor-flow-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
