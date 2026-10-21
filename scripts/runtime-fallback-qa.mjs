import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let passed=false;
try{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'deviceMemory',{get:()=>4});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};
 });
 await page.route('**/optimized/hero-*.webp',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
 assert.equal(await page.locator('.tv-noise').getAttribute('data-noise-rate'),'12');
 await page.locator('#about').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top));await page.waitForTimeout(700);
 await page.locator('.studio-link[href="#contact"]').click();
 await page.waitForFunction(()=>location.hash==='#contact'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'),'poster');
 await page.waitForTimeout(200);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
 assert.ok(await page.evaluate(()=>Math.abs(scrollY-(document.documentElement.scrollHeight-innerHeight))<2));
 await page.screenshot({path:'artifacts/runtime-performance/low-memory-no-webgl-390.png'});
 await page.locator('.footer-return-sticker').tap();
 await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 assert.equal(await page.evaluate(()=>document.querySelector('#main-content').inert||document.body.style.overflow==='hidden'),false);
 assert.deepEqual(errors,[]);passed=true;console.log('PASS delayed assets, low-memory budget, no-WebGL poster, restored footer and touch return');
}finally{await writeFile('artifacts/runtime-performance/fallback.json',JSON.stringify({errors,pass:passed},null,2));await browser.close();}
