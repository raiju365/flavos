import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try{
 for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,640,true]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.loaderRestoreFrames=[];
   const sample=()=>{
    const l=document.querySelector('#loading-screen');
    if(l?.dataset.phase==='opening') loaderRestoreFrames.push({time:performance.now(),mode:l.dataset.reveal||'fresh',p:Number(l.dataset.revealProgress||0),y:scrollY,opacity:getComputedStyle(l).opacity,d:l.querySelector('clipPath path')?.getAttribute('d'),ready:document.querySelector('.footer-signature')?.dataset.signatureReady,grain:getComputedStyle(document.querySelector('.tv-noise')).opacity});
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  const ready=()=>page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});await ready();
  assert.ok((await page.evaluate(()=>loaderRestoreFrames)).every(f=>f.mode==='fresh'),'fresh opening stays on its existing path');
  for(const destination of ['home',width===820?'about':'footer']){
   if(destination==='home')await page.evaluate(()=>scrollTo(0,0));
   else if(destination==='footer') {await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));}
   else{await page.locator('#about').scrollIntoViewIfNeeded();}
   await page.waitForTimeout(1000);
   const saved=await page.evaluate(()=>scrollY);
   await page.reload({waitUntil:'commit'});
   await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.phase==='opening');
   if(!reduced){
    assert.equal(await page.locator('#loading-screen').getAttribute('data-reveal'),'curtain');
    await page.waitForFunction(()=>Number(document.querySelector('#loading-screen')?.dataset.revealProgress)>.15);
    const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,400);await page.waitForTimeout(80);
    const lockedState=await page.evaluate(()=>({y:scrollY,phase:document.querySelector('#loading-screen')?.dataset.phase,p:document.querySelector('#loading-screen')?.dataset.revealProgress,shield:!!document.querySelector('.loader-reveal-shield')}));
    assert.ok(Math.abs(lockedState.y-before)<2,`scroll stays locked during reveal ${JSON.stringify({before,...lockedState})}`);
    await page.screenshot({path:`artifacts/restore-curtain-${width}-${destination}-middle.png`});
   }
   await ready();
   const frames=await page.evaluate(()=>loaderRestoreFrames);
   assert.ok(frames.length>3);
   assert.ok(frames.every(f=>f.ready==='true'),'3D is complete throughout reveal');
   assert.ok(frames.every(f=>f.grain==='0.1'));
   assert.ok(Math.max(...frames.map(f=>f.y))-Math.min(...frames.map(f=>f.y))<2,'restored page stays still while cover moves');
   if(!reduced){
    assert.ok(frames.some(f=>f.p>.2&&f.p<.8));
    for(let i=1;i<frames.length;i++)assert.ok(frames[i].p>=frames[i-1].p);
    assert.ok(frames.every(f=>f.opacity==='1'),'curtain reveals with geometry rather than opacity');
    assert.ok(frames.some(f=>f.d?.includes('C')));
   }else assert.ok(frames.every(f=>f.mode==='reduced'&&!f.d));
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-saved)<3,'restoration preserves the last position');
   assert.equal(await page.locator('.loader-reveal-shield').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`artifacts/restore-curtain-${width}-${destination}-settled.png`});
   results.push({width,destination,reduced,frames,saved});console.log('PASS restored reveal',width,destination);
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile('artifacts/loader-restore-reveal-qa.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
