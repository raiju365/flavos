import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],samples=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
 for(let i=0;i<30;i++){
   await page.waitForTimeout(450);
   samples.push(await page.locator('#hero').evaluate(e=>({seed:e.dataset.apertureSeed,blend:+e.querySelector('canvas.hero-aperture').dataset.shapeBlend,size:+e.dataset.apertureSize,scroll:scrollY,overflow:document.documentElement.scrollWidth-innerWidth})));
   if([2,12,23].includes(i))await page.screenshot({path:`artifacts/hero-idle-morph-${i}.png`});
 }
 assert.ok(new Set(samples.map(s=>s.seed)).size>=3,'multiple new shapes without any input');
 assert.ok(samples.filter(s=>s.blend>.1&&s.blend<.9).length>8,'gradual morph through intermediate states');
 assert.ok(samples.every(s=>s.scroll===0&&s.overflow===0));
 assert.ok(Math.abs(samples[0].size-779.76)<.1,'14 percent larger at 1440x900');
 for(const [width,height] of [[820,1000],[390,844],[320,700]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(600);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   await page.screenshot({path:`artifacts/hero-idle-morph-${width}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
 const seed=await page.locator('#hero').getAttribute('data-aperture-seed');
 await page.waitForTimeout(4600);assert.equal(await page.locator('#hero').getAttribute('data-aperture-seed'),seed);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({uniquePatterns:new Set(samples.map(s=>s.seed)).size,intermediateSamples:samples.filter(s=>s.blend>.1&&s.blend<.9).length,errors}));
}finally{await writeFile('artifacts/hero-idle-morph-qa.json',JSON.stringify({samples,errors},null,2));await browser.close();}
