import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors=[];
try {
for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]) {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow!=='hidden');
 await page.locator('.studio-link[href="#contact"]').click();
 await page.waitForFunction(()=>location.hash==='#contact'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 if(!reduced){
  await page.waitForFunction(()=>document.querySelector('.footer-headline').dataset.arrival==='playing');
  await page.screenshot({path:`artifacts/contact-arrival-${width}-mid.png`});
  await page.waitForFunction(()=>document.querySelector('.footer-headline').dataset.arrival==='complete');
 }
 await page.waitForTimeout(600);
 const state=await page.locator('.footer-headline').evaluate(el=>{const r=el.getBoundingClientRect();return {font:getComputedStyle(el).fontFamily,fontLoaded:document.fonts.check('400 100px Fraunces'),left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:document.documentElement.scrollWidth-innerWidth,arrival:el.dataset.arrival,filters:[...el.querySelectorAll('.contact-letter')].map(x=>getComputedStyle(x).filter)};});
 assert.equal(state.overflow,0);assert.ok(state.left>=0&&state.right<=width,JSON.stringify(state));assert.ok(state.fontLoaded);assert.ok(state.filters.every(x=>x==='none'));
 await page.screenshot({path:`artifacts/contact-arrival-${width}${reduced?'-reduced':''}.png`});
 await page.locator('.footer-back-to-top').click();
 await page.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(800);
 assert.ok(await page.evaluate(()=>scrollY<10));
 console.log('PASS',width,reduced,state);
 await page.close();
}
assert.deepEqual(errors,[]);
}finally{await browser.close();}
