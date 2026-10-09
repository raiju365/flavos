import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium }=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],results=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#hero img[src*="/karya/"], .hero-depth-tile').count(),0);
  assert.ok(await page.locator('.orbit-card img').count()>0,'gallery retains artwork');
  const sample=()=>page.locator('#hero').evaluate(el=>{
    const c=el.querySelector('.hero-aperture');c.dispatchEvent(new Event('aperture-restored'));
    const gl=c.getContext('webgl'),pixels=new Uint8Array(c.width*c.height*4);
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    // Alpha is the aperture itself, independent of painting and page grain.
    const alpha=[];for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8)alpha.push(pixels[(y*c.width+x)*4+3]);
    return {data:{...el.dataset},alpha};
  });
  const first=await sample();await page.waitForTimeout(1400);const second=await sample();
  const changed=first.alpha.filter((v,i)=>Math.abs(v-second.alpha[i])>10).length;
  assert.ok(changed>40,`idle contour moves: ${changed}`);
  await page.screenshot({path:'artifacts/hero-jelly-idle.png'});
  const run=async(step,frames)=>{
    const energies=[];
    for(let i=0;i<frames;i++){
      await page.evaluate(step=>scrollBy(0,step),step);await page.waitForTimeout(40);
      energies.push(+(await page.locator('#hero').getAttribute('data-motion-energy')));
    }
    return Math.max(...energies);
  };
  const slow=await run(4,18);await page.waitForTimeout(1400);
  const fast=await run(28,18);
  assert.ok(fast>slow*1.5,JSON.stringify({slow,fast}));
  await page.screenshot({path:'artifacts/hero-jelly-scroll.png'});
  await page.waitForTimeout(2100);
  const settled=+(await page.locator('#hero').getAttribute('data-motion-energy'));
  assert.ok(settled<fast*.15,JSON.stringify({settled,fast}));
  for(const progress of [.5,.6,.9,.4,0]){
    await page.evaluate(p=>scrollTo(0,p*900*1.8),progress);await page.waitForTimeout(650);
    const data=await page.locator('#hero').evaluate(e=>({...e.dataset}));
    results.push({progress,...data});
    await page.screenshot({path:`artifacts/hero-jelly-${progress}.png`});
  }
  await page.evaluate(()=>scrollTo(0,4200));await page.waitForTimeout(700);
  const stopped=await page.locator('#hero').getAttribute('data-motion-clock');
  await page.waitForTimeout(500);assert.equal(await page.locator('#hero').getAttribute('data-motion-clock'),stopped);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);
  assert.notEqual(await page.locator('#hero').getAttribute('data-motion-clock'),stopped);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
  const reducedA=await sample();await page.waitForTimeout(500);const reducedB=await sample();
  assert.deepEqual(reducedA.alpha,reducedB.alpha,'reduced motion is static');
  assert.equal(reducedB.data.scratch,'0.0000');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(500);
  assert.notEqual(await page.locator('#hero').getAttribute('data-motion-clock'),reducedB.data.motionClock);
  assert.deepEqual(errors,[]);
  results.push({changedAlphaSamples:changed,slow,fast,settled,errors});
  console.log(JSON.stringify(results,null,2));
} finally {
  await writeFile('artifacts/hero-jelly-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
