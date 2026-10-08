import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
try{for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]){
const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600,reducedMotion:reduced?'reduce':'no-preference'});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.phase==='opening',null,{timeout:120000});
await page.screenshot({path:`artifacts/podium-opening-${width}-${reduced}-mid.png`});
await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
await page.waitForTimeout(200);
const state=await page.evaluate(()=>{const mark=document.querySelector('.hero-bg-wrapper'),r=mark.getBoundingClientRect();return {background:getComputedStyle(document.querySelector('#hero')).backgroundColor,mark:{x:r.x,y:r.y,w:r.width,h:r.height},copy:[...document.querySelectorAll('.hero-introduction>*')].map(x=>({opacity:getComputedStyle(x).opacity,bottom:x.getBoundingClientRect().bottom})),images:[...document.querySelectorAll('.hero-collage img')].every(i=>i.complete&&i.naturalWidth>0),overflow:document.documentElement.scrollWidth-innerWidth,locked:document.body.style.overflow==='hidden',navColor:getComputedStyle(document.querySelector('.studio-link')).color};});
assert.equal(state.overflow,0);assert.equal(state.images,true);assert.equal(state.locked,false);assert.ok(state.mark.w>width*.4);assert.ok(state.mark.x>=0&&state.mark.x+state.mark.w<=width);assert.ok(state.copy.every(c=>c.opacity==='1'&&c.bottom<=height));
await page.screenshot({path:`artifacts/podium-opening-${width}-${reduced}-ready.png`});
await page.locator('.hero-introduction a').click();await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.studio-link[href="#projects"]').click();await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.studio-link[href="#hero"]').click();await page.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
assert.equal(await page.locator('.hero-bg-wrapper').evaluate(el=>getComputedStyle(el).clipPath),'none');
results.push({width,height,reduced,...state});console.log('PASS',width,reduced);await page.close();
}assert.deepEqual(errors,[]);}finally{await writeFile('artifacts/podium-opening-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
