import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage();const results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
for(const [width,height] of [[1440,900],[820,1000],[390,844],[360,640]]){
 await page.setViewportSize({width,height});
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow!=='hidden');
 for(const p of [.15,.4,.7,1,.7,.4,0]){
  await page.evaluate(p=>{const el=document.querySelector('#projects');window.scrollTo({top:scrollY+el.getBoundingClientRect().top-innerHeight*2.4*(1-p),behavior:'instant'});},p);
  await page.waitForTimeout(850);
  results.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,phase:document.querySelector('#projects').dataset.entryPhase,p:document.querySelector('#projects').dataset.entryProgress,photo:getComputedStyle(document.querySelector('.portrait-core')).transform,top:document.querySelector('.orbit-overview').getBoundingClientRect().top})));
  if([.4,.7,1].includes(p))await page.screenshot({path:`artifacts/about-gallery-${width}-${p}.png`});
 }
}
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
results.push(await page.evaluate(()=>({reduced:true,phase:document.querySelector('#projects').dataset.entryPhase,fixed:document.querySelector('.orbit-overview').classList.contains('is-emerging')})));
await writeFile('artifacts/about-gallery-qa.json',JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({results,errors}));await browser.close();
