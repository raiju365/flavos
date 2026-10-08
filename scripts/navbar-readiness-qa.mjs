import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try{
for(const [width,height,reduced] of (process.env.REDUCED ? [[390,844,true]] : process.env.BASELINE ? [[1440,900,false]] : [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]])){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:120000});
 for(const id of ['contact','hero','about','projects','hero','projects','about']){
  await page.evaluate(id=>{
   window.navSamples=[];window.navRecording=true;
   const sample=()=>{
    if(!window.navRecording)return;
    const phase=document.querySelector('.colonnade-overlay').dataset.phase;
    if(phase==='reveal'||phase==='ready'||(!document.documentElement.classList.contains('is-colonnade-transitioning')&&location.hash==='#'+id)){
     const target=document.getElementById(id);
     const visible=el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
     window.navSamples.push({phase,y:scrollY,images:[...target.querySelectorAll('img')].filter(visible).every(img=>img.complete&&img.naturalWidth>0),arrival:document.querySelector('.footer-headline')?.dataset.arrival,letterOpacity:Math.min(...[...document.querySelectorAll('.contact-letter')].map(el=>Number(getComputedStyle(el).opacity))),entry:document.querySelector('#projects').dataset.entryProgress,navVisible:getComputedStyle(document.querySelector('.studio-header')).visibility,overflow:document.documentElement.scrollWidth-innerWidth});
    }
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  },id);
  if(id === 'hero' && await page.evaluate(()=>location.hash === '#contact')) await page.locator('.footer-back-to-top').click(); else await page.locator(`.studio-link[href="#${id}"]`).click();
  await page.waitForFunction(id=>location.hash==='#'+id&&!document.documentElement.classList.contains('is-colonnade-transitioning'),id);
  const samples=await page.evaluate(()=>{window.navRecording=false;return window.navSamples;});
  const state=await page.evaluate(()=>({locked:document.querySelector('#main-content').inert||document.documentElement.style.overflow==='hidden',focus:document.activeElement.closest('section,footer')?.id}));
  results.push({width,reduced,id,samples,state});
  if(!process.env.BASELINE){assert.ok(samples.length);assert.ok(samples.every(s=>s.images&&s.overflow===0));assert.equal(state.locked,false);if(id==='contact'&&!reduced)assert.ok(samples.every(s=>s.letterOpacity===1));if(id==='projects')assert.ok(samples.every(s=>s.entry==='1.0000'));}
  if(id==='contact'||id==='projects')await page.screenshot({path:`artifacts/nav-ready-${width}-${reduced}-${id}.png`});
 }
 console.log('PASS',width,reduced);await page.close();
}
assert.deepEqual(errors,[]);
}finally{await writeFile(`artifacts/nav-ready-${process.env.REDUCED?'reduced':process.env.BASELINE?'before':'after'}.json`,JSON.stringify({results,errors},null,2));await browser.close();}


