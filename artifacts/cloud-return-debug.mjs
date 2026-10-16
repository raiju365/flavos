import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>{
   const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height}:null;};
   window.cloudDebug=[];
   window.cloudDebugSnap=(name,extra={})=>{
     const root=document.documentElement,overlay=document.querySelector('.colonnade-overlay');
     const value={name,time:performance.now(),y:scrollY,height:root.scrollHeight,max:root.scrollHeight-innerHeight,rootClass:root.className,rootInline:root.getAttribute('style'),overflow:getComputedStyle(root).overflow,bodyOverflow:getComputedStyle(document.body).overflow,inert:document.querySelector('#main-content')?.inert,footer:rect('#contact'),stage:rect('.footer-stage'),signature:rect('.signature-footer'),backtop:rect('.footer-back-to-top'),stageTranslate:document.querySelector('.footer-stage')?.style.translate,phase:overlay?.dataset.phase,cloud:overlay?.dataset.cloudProgress,...extra};
     window.cloudDebug.push(value);return value;
   };
   document.addEventListener('click',e=>{if(e.target.closest('.footer-back-to-top'))window.cloudDebugSnap('click-capture');},true);
   document.addEventListener('click',e=>{if(e.target.closest('.footer-back-to-top'))window.cloudDebugSnap('click-bubble');});
   window.addEventListener('scroll',()=>{if(window.cloudDebugActive)window.cloudDebugSnap('scroll-event');},{passive:true});
   window.addEventListener('DOMContentLoaded',()=>{
     new MutationObserver(m=>{if(window.cloudDebugActive)window.cloudDebugSnap('mutation',{mutations:m.map(x=>({target:x.target.tagName,old:x.oldValue,now:x.target.getAttribute(x.attributeName)}))});}).observe(document.documentElement,{attributes:true,attributeFilter:['class','style'],attributeOldValue:true});
   });
 });
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
 for(const click of ['locator','mouse']){
   await page.locator('#contact').scrollIntoViewIfNeeded();
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
   await page.waitForTimeout(650);
   const before=await page.evaluate(()=>{cloudDebug=[];cloudDebugActive=true;cloudDebugFrameCount=0;const sample=()=>{if(!cloudDebugActive)return;const overlay=document.querySelector('.colonnade-overlay');cloudDebugSnap('frame');requestAnimationFrame(sample);};requestAnimationFrame(sample);return cloudDebugSnap('before');});
   await page.screenshot({path:`artifacts/cloud-return-debug-${click}-before.png`});
   if(click==='locator')await page.locator('.footer-back-to-top').click();
   else {const bounds=await page.locator('.footer-back-to-top').boundingBox();await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);}
   await page.waitForFunction(()=>document.querySelector('.colonnade-overlay').dataset.phase==='cover'&&Number(document.querySelector('.colonnade-overlay').dataset.cloudProgress)>.3);
   await page.screenshot({path:`artifacts/cloud-return-debug-${click}-cover.png`});
   await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning'));
   const samples=await page.evaluate(()=>{cloudDebugActive=false;return cloudDebug;});
   results.push({click,before,samples});
   console.log(JSON.stringify({click,before,events:samples.filter(s=>s.name!=='frame'),first:samples.find(s=>s.phase==='cover'),coverRange:[...new Set(samples.filter(s=>s.phase==='cover').map(s=>s.y))]}));
 }
}finally{await writeFile('artifacts/cloud-return-debug.json',JSON.stringify(results,null,2));await browser.close();}
