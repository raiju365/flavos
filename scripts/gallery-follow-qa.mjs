import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage();const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const [width,height] of [[1440,900],[820,1000],[390,844],[360,640]]){
 await page.setViewportSize({width,height});await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
 let origin;
 for(const p of [.1,.3,.5,.75,.95,.5,.1]){
  await page.evaluate(p=>{const work=document.querySelector('#projects');const stage=document.querySelector('.about-reading-stage');const end=Math.max(innerHeight,stage.getBoundingClientRect().height+parseFloat(stage.style.getPropertyValue('--gallery-stage-top')||0));scrollTo({top:scrollY+work.getBoundingClientRect().top-end-innerHeight*4*(1-p),behavior:'instant'});},p);
  await page.waitForTimeout(900);
  const state=await page.evaluate(()=>{const r=document.querySelector('.portrait-orbit').getBoundingClientRect();const cam=document.querySelector('.orbit-camera').getBoundingClientRect();return {width:innerWidth,photo:{x:r.x,y:r.y,w:r.width,h:r.height},camera:{x:cam.x,y:cam.y},p:document.querySelector('#projects').dataset.entryProgress,overflow:document.documentElement.scrollWidth-innerWidth,transforms:[...document.querySelectorAll('.orbit-card')].map(c=>c.style.transform)};});
  origin??=state.photo;
  results.push({requested:p,...state});
  assert.equal(state.overflow,0);
  if (p === .75 || p === .95) assert.ok(state.photo.y < -state.photo.h * .4, `frame must leave above viewport ${width}`);
  assert.equal(state.camera.y,0);
  if([.3,.5,.75].includes(p))await page.screenshot({path:`artifacts/gallery-follow-${width}-${p}.png`});
 }
}
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
results.push(await page.evaluate(()=>({reduced:true,fixed:document.querySelector('.orbit-overview').classList.contains('is-emerging'),phase:document.querySelector('#projects').dataset.entryPhase})));
assert.deepEqual(errors,[]);await writeFile('artifacts/gallery-follow-qa.json',JSON.stringify({results,errors},null,2));console.log('PASS: descending camera / departing frame, responsive overflow, reverse and reduced motion; '+results.length+' states');await browser.close();

