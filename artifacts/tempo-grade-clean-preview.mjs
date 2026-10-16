import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const recordingStartedAt=Date.now();
 const page=await browser.newPage({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/tempo-grade-clean-video',size:{width:1440,height:900}}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
 await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(950);
 const box=await page.locator('.footer-back-to-top').boundingBox();
 const start=Math.max(0,(Date.now()-recordingStartedAt)/1000-.25);
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'),undefined,{timeout:18000});
 await page.waitForTimeout(500);
 const duration=(Date.now()-recordingStartedAt)/1000-start;
 const final=await page.evaluate(()=>({y:scrollY,hash:location.hash,inert:document.querySelector('#main-content').inert,overflow:document.documentElement.style.overflow,overlay:{...document.querySelector('.colonnade-overlay').dataset},scale:document.querySelector('#hero').dataset.returnScale,focused:document.activeElement.id}));
 assert.equal(final.y,0);assert.equal(final.inert,false);assert.equal(final.overflow,'');assert.equal(final.overlay.phase,'idle');assert.equal(Number(final.overlay.cloudGradeVisible),0);assert.equal(final.scale,'1.0000');assert.deepEqual(errors,[]);
 const video=page.video();await page.close();
 const raw='artifacts/tempo-grade-clean-preview-raw.webm';await video.saveAs(raw);
 await writeFile('artifacts/tempo-grade-clean-preview.json',JSON.stringify({start,duration,raw,viewport:{width:1440,height:900},instrumented:false,final,errors},null,2));
 console.log('PASS clean tempo and color grade recording saved');
}finally{await browser.close();}
