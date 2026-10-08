import {createRequire} from 'node:module';
import {writeFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium} = require('playwright');
const browser = await chromium.launch({channel:'msedge', headless:true});
const results=[], errors=[];
const label=process.argv[2] || 'audit';
await mkdir('artifacts/mobile', {recursive:true});
try {
const page=await browser.newPage({viewport:{width:320,height:568},hasTouch:true,isMobile:true,deviceScaleFactor:1});
page.on('pageerror',e=>errors.push({error:e.message}));
await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden',null,{timeout:120000});
for(const [width,height] of [[280,568],[320,480],[320,568],[360,640],[390,844],[430,932],[540,720],[699,900],[700,900],[768,1024],[844,390],[667,375],[1440,900]]) {
 if(process.argv[3] && !process.argv[3].split(',').map(Number).includes(width)) continue;
 await page.setViewportSize({width,height});
 await page.waitForTimeout(700);
 const result={width,height,states:[]};
 for(const hash of ['hero','about','projects','contact']) {
  await page.locator(`.studio-link[href="#${hash}"]`).click();
  try { await page.waitForFunction(hash=>location.hash===`#${hash}`&&!document.documentElement.classList.contains('is-colonnade-transitioning'),hash); }
  catch(error) {console.log('NAV FAILURE',width,height,hash,await page.evaluate(()=>({hash:location.hash,y:scrollY,root:document.documentElement.className,body:document.body.style.overflow})));throw error;}
  await page.waitForTimeout(900);
  if(hash==='contact') await page.waitForFunction(()=>!document.querySelector('#contact-heading').dataset.arrival||document.querySelector('#contact-heading').dataset.arrival==='complete');
  result.states.push(await page.evaluate(hash=>{
   const box=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,font:c.fontSize,line:c.lineHeight,opacity:c.opacity};};
   return {hash,y:scrollY,overflow:document.documentElement.scrollWidth-innerWidth,nav:[...document.querySelectorAll('.studio-desktop a')].map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('href'),x:r.x,y:r.y,w:r.width,h:r.height};}),first:box('.about-reading-content--left'),last:box('.about-reading-content--right'),copy:box('.about-reading-copy'),portrait:box('.portrait-orbit'),entry:document.querySelector('#projects').dataset.entryProgress,footer:box('.signature-footer'),broken:[...document.images].filter(i=>i.getBoundingClientRect().width&&i.complete&&!i.naturalWidth).map(i=>i.src)};
  },hash));
  if(['about','projects','contact'].includes(hash)) await page.screenshot({path:`artifacts/mobile/${label}-${width}x${height}-${hash}.png`});
  if(hash==='about') {
   await page.evaluate(()=>{
    const el=document.querySelector('#about');
    const text=[...el.querySelectorAll('.about-reading-copy')].reduce((sum,p)=>sum+Math.round(p.querySelectorAll('.about-reading-word').length*5.5),0);
    const total=parseFloat(el.style.getPropertyValue('--about-scroll-distance'));
    scrollTo({top:scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*text/total,behavior:'instant'});
   });
   await page.waitForTimeout(1200);
   const reading=await page.evaluate(()=>({bottom:document.querySelector('.about-reading-content--right').getBoundingClientRect().bottom,words:[...document.querySelectorAll('.about-reading-word')].map(e=>Number(getComputedStyle(e).opacity)),overflow:document.documentElement.scrollWidth-innerWidth}));
   assert.ok(reading.words.every(v=>v>.99),'both passages revealed');assert.ok(reading.bottom<=height+2,'last passage reachable');
   await page.screenshot({path:`artifacts/mobile/${label}-${width}x${height}-reading.png`});
  }
 }
 results.push(result); console.log('PASS layout/navigation/reading',width,height);
 for(const s of result.states) {assert.equal(s.overflow,0);assert.deepEqual(s.broken,[]);}
 assert.equal(result.states[2].entry,'1.0000');
 await page.locator('.footer-back-to-top').click();
 await page.waitForFunction(()=>scrollY<2&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(400);
 await writeFile(`artifacts/mobile/${label}.json`,JSON.stringify({results,errors},null,2));
}
assert.deepEqual(errors,[]);
} finally {await writeFile(`artifacts/mobile/${label}.json`,JSON.stringify({results,errors},null,2));await browser.close();}
