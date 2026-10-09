import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const b=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
try{
 for(const [width,height] of [[600,880],[1440,900],[390,844],[320,700]]){
 const p=await b.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});await p.waitForTimeout(1200);
 for(const fraction of [.9,.6,.25,0,-.25,.25,.6]){
 await p.locator('.folio-logo-pause').evaluate((e,f)=>scrollTo(0,e.getBoundingClientRect().top+scrollY-innerHeight*f),fraction);await p.waitForTimeout(650);
 const s=await p.locator('.studio-header').evaluate(e=>{
 const mark=e.querySelector('.logo-journey-mark'),stage=e.querySelector('.logo-style-cycle'),base=e.querySelector('.logo-journey-base');
 return {blend:getComputedStyle(e).mixBlendMode,visibility:getComputedStyle(e).visibility,opacity:+getComputedStyle(e).opacity,markVisible:getComputedStyle(mark).visibility,stage:getComputedStyle(stage).visibility,base:getComputedStyle(base).visibility,filter:getComputedStyle(base).filter,journey:e.classList.contains('is-logo-journey'),overflow:document.documentElement.scrollWidth-innerWidth,images:[...stage.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)};
 });
 assert.equal(s.visibility,'visible');assert.equal(s.opacity,1);assert.equal(s.markVisible,'visible');assert.equal(s.overflow,0);
 if(s.journey)assert.equal(s.blend,'normal');assert.ok(s.base==='visible'||s.stage==='visible');assert.ok(s.images);results.push({width,fraction,...s});
 if(fraction===.25)await p.screenshot({path:`artifacts/logo-handoff-fixed-${width}.png`});
 }
 if(width===600){await p.locator('.folio-logo-pause').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY+20));await p.waitForTimeout(300);const first=await p.locator('.logo-style-cycle').getAttribute('data-style');await p.waitForTimeout(2700);const next=await p.locator('.logo-style-cycle').getAttribute('data-style');assert.notEqual(next,first);results.push({cycle:[first,next]});}
 await p.close();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:results.length,errors}));
}finally{await writeFile('artifacts/logo-handoff-qa.json',JSON.stringify({results,errors},null,2));await b.close();}


