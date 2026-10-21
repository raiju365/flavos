import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],expectedDiagnostics=[];
const finalState=page=>page.evaluate(()=>({hash:location.hash,y:scrollY,inert:document.querySelector('#main-content').inert,overflow:document.documentElement.style.overflow,focus:document.activeElement.id,peel:{...document.querySelector('.footer-return-peel').dataset},overlay:{...document.querySelector('.colonnade-overlay').dataset},sourceHidden:document.querySelector('.footer-return-sticker').classList.contains('is-peeled')}));
try{ const fallback=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 fallback.on('pageerror',e=>errors.push(e.message));fallback.on('console',e=>{if(e.type()!=='error')return;if(/Error creating WebGL context/.test(e.text()))expectedDiagnostics.push(e.text());else errors.push(e.text());});
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
 await fallback.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});
 await fallback.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
 await fallback.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await fallback.waitForTimeout(650);
 const box=await fallback.locator('.footer-return-sticker').boundingBox();
 await fallback.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 await fallback.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'),undefined,{timeout:18000});
 const fallbackFinal=await finalState(fallback);
 assert.equal(fallbackFinal.inert,false);assert.equal(fallbackFinal.overflow,'');assert.equal(fallbackFinal.sourceHidden,false);
 await writeFile('artifacts/wind-btt-sticker-touch-fallback.json',JSON.stringify({final:fallbackFinal,errors,expectedDiagnostics},null,2));
 assert.deepEqual(errors,[]);await fallback.close();console.log('PASS touch input and no-WebGL navigation fallback');
}finally{await browser.close();}


