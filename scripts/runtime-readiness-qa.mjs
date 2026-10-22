import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
let passed=false;
await mkdir('artifacts/runtime-performance',{recursive:true});
const ready=page=>page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
async function state(page){return page.evaluate(()=>{
  const host=document.querySelector('.footer-signature'),poster=host.querySelector('img'),canvas=host.querySelector('.footer-signature-canvas');
  return {ready:!!window.isMainPageReady,phase:document.querySelector('#loading-screen')?.dataset.phase,
    signature:host.dataset.signatureReady,stickers:host.dataset.stickersLoaded,canvases:host.querySelectorAll('.footer-signature-canvas').length,
    poster:getComputedStyle(poster).visibility,canvas:canvas&&getComputedStyle(canvas).visibility,
    logos:document.querySelector('.logo-style-cycle').dataset.assetsLoaded,
    images:[...document.querySelectorAll('#main-content img, .folio-nav img')].every(image=>image.complete&&image.naturalWidth>0),
    bottom:document.documentElement.scrollHeight-innerHeight-scrollY,
    overlaps:window.qaOverlaps||0};
});}
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.qaOverlaps=0;
    const sample=()=>{
      const host=document.querySelector('.footer-signature'),poster=host?.querySelector('img'),canvas=host?.querySelector('.footer-signature-canvas');
      if(poster&&canvas&&getComputedStyle(poster).visibility==='visible'&&getComputedStyle(canvas).visibility==='visible'&&Number(getComputedStyle(poster).opacity)>.01)window.qaOverlaps++;
      requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  });
  let release,heldResolve;
  let held=new Promise(resolve=>heldResolve=resolve);
  let blocker=new Promise(resolve=>release=resolve);
  const pattern=width===1440?'**/logoanimasi/optimized/logo13-*.webp':'**/footer/stickers/web/BIOLOGY.webp';
  await page.route(pattern,async route=>{heldResolve();await blocker;await route.continue();});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await held;
  await page.waitForTimeout(1100);
  const blocked=await state(page);
  assert.equal(blocked.ready,false);assert.equal(blocked.phase,'loading');
  if(width===390){
    // Expose only the host under the opaque loader to inspect its local handoff.
    const warmup=await page.locator('.footer-signature').evaluate(host=>{
      host.style.visibility='visible';
      const result={poster:getComputedStyle(host.querySelector('img')).visibility,canvas:getComputedStyle(host.querySelector('canvas')).visibility};
      host.style.visibility='';return result;
    });
    assert.deepEqual(warmup,{poster:'visible',canvas:'hidden'});
  }
  release();await ready(page);
  const initial=await state(page);
  assert.equal(initial.images,true);assert.equal(initial.signature,'true');assert.equal(initial.stickers,'6');
  assert.equal(initial.canvases,1);assert.equal(initial.poster,'hidden');assert.equal(initial.logos,'10');assert.equal(initial.overlaps,0);
  await page.unroute(pattern);
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(500);
  blocker=new Promise(resolve=>release=resolve);held=new Promise(resolve=>heldResolve=resolve);
  await page.route('**/footer/stickers/web/BIOLOGY.webp',async route=>{heldResolve();await blocker;await route.continue();});
  await page.reload({waitUntil:'domcontentloaded'});await held;await page.waitForTimeout(1000);
  assert.equal((await state(page)).ready,false);release();await ready(page);
  const restored=await state(page);assert.ok(Math.abs(restored.bottom)<2);assert.equal(restored.overlaps,0);assert.equal(restored.canvases,1);
  await page.screenshot({path:`artifacts/runtime-performance/readiness-${width}-footer.png`});
  results.push({width,blocked,initial,restored});
  console.log('PASS held asset blocks opening, atomic poster/3D handoff, footer refresh',width);
  await page.close();
 }
 // Failed GPU texture remains behind the loader and can be retried without a second canvas.
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/footer/stickers/web/BIOLOGY.webp',route=>route.abort('failed'));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.phase==='error',null,{timeout:90000});
 const failed=await state(page);assert.equal(failed.ready,false);
 await page.unroute('**/footer/stickers/web/BIOLOGY.webp');await page.locator('.loader-retry').click();await ready(page);
 const retried=await state(page);assert.equal(retried.signature,'true');assert.equal(retried.canvases,1);assert.equal(retried.stickers,'6');assert.equal(retried.overlaps,0);
 results.push({failureAndRetry:{failed,retried}});console.log('PASS failed asset stays covered; retry prepares a single complete scene');await page.close();
 assert.deepEqual(errors,[]);passed=true;
}finally{
 await writeFile('artifacts/runtime-performance/readiness.json',JSON.stringify({passed,results,errors},null,2));await browser.close();
}
