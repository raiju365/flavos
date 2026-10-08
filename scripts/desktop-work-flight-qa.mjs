import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[],errors=[];
try{
for(const [width,height] of [[1440,900],[1792,948],[1280,720]]){
 const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
 await page.locator('.studio-link[href="#about"]').click();
 await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(1400);
 await page.evaluate(()=>{const about=document.querySelector('#about');const total=parseFloat(about.style.getPropertyValue('--about-scroll-distance'));scrollTo({top:scrollY+about.getBoundingClientRect().top+(about.offsetHeight-innerHeight)*((total-800)/total-.015),behavior:'instant'});});
 await page.waitForTimeout(600);await page.mouse.move(30,100);await page.mouse.wheel(0,height*2);
 await page.waitForFunction(()=>document.querySelector('#about').dataset.absorbComplete==='true');await page.waitForTimeout(1000);
 let previous=0;const states=[];
 for(const p of [.1,.25,.4,.55,.75,1,1.15,.75,.4,.1]){
  await page.mouse.wheel(0,(p-previous)*height*6);previous=p;await page.waitForTimeout(950);
  const state=await page.evaluate(()=>{
   const portrait=document.querySelector('.portrait-orbit').getBoundingClientRect();
   const cards=[...document.querySelectorAll('.orbit-card')].filter(el=>getComputedStyle(el).visibility!=='hidden').map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,onscreen:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth,clear:r.top>=Math.max(80,portrait.bottom)&&r.bottom<=innerHeight};});
   return {progress:+document.querySelector('#projects').dataset.entryProgress,portrait:{top:portrait.top,bottom:portrait.bottom,w:portrait.width,h:portrait.height},cards,overflow:document.documentElement.scrollWidth-innerWidth,angle:document.querySelector('.orbit-stage').dataset.angle};
  });states.push({p,...state});assert.equal(state.overflow,0);assert.ok(state.cards.some(c=>c.onscreen),'departing art in viewport');
  if(p===.4||p===.55)assert.ok(state.cards.some(c=>c.clear),'whole departing cards visible during assembly');
  await page.screenshot({path:`artifacts/desktop-work-flight-${width}-${p}.png`});
 }
 assert.ok(states.every(s=>s.portrait.w===states[0].portrait.w&&s.portrait.h===states[0].portrait.h));
 assert.notEqual(states[5].angle,states[6].angle);
 results.push({width,height,states});console.log('PASS',width,'visible departure, unchanged portrait size, assembly, rotating hold, reverse');await page.close();
}
assert.deepEqual(errors,[]);
}finally{await writeFile('artifacts/desktop-work-flight-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}



