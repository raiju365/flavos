import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
let result;
try{
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(850);
result=await page.evaluate(()=>{
 const summary=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,class:e.className,inert:e.inert,pointer:s.pointerEvents,visibility:s.visibility,opacity:s.opacity,rect:{left:r.left,top:r.top,width:r.width,height:r.height},position:s.position,z:s.zIndex};};
 const sample=sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return{selector:sel,x,y,element:summary(e),hits:document.elementsFromPoint(x,y).map(summary)};};
 window.mobileClickLog=[];document.addEventListener('click',e=>mobileClickLog.push({target:summary(e.target),path:e.composedPath().filter(e=>e instanceof Element).map(e=>({tag:e.tagName,class:e.className}))}),true);
 return{y:scrollY,header:summary(document.querySelector('.studio-header')),samples:['.footer-back-to-top','.back-top-label','.back-top-pages'].map(sample)};
});
console.log(JSON.stringify(result));
const point=result.samples[0];await page.mouse.click(point.x,point.y);await page.waitForTimeout(350);
result.after=await page.evaluate(()=>({y:scrollY,clicks:mobileClickLog,overlay:{...document.querySelector('.colonnade-overlay').dataset}}));
console.log(JSON.stringify(result.after));
await page.screenshot({path:'artifacts/cloud-return-debug-mobile-hit.png'});
}finally{await writeFile('artifacts/cloud-return-debug-mobile.json',JSON.stringify(result,null,2));await browser.close();}
