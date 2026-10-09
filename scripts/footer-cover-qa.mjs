import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try {
 for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[667,375,false],[390,844,true]]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await p.goto('http://127.0.0.1:5180/');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
  await p.waitForTimeout(1200);
  const top=await p.locator('#contact').evaluate(e=>e.getBoundingClientRect().top+scrollY);
  const samples=[];
  for(const cover of [.01,.25,.5,.75,.99,.75,.5,.25,.01]){
   await p.evaluate(y=>scrollTo(0,y),top-height*(1-cover));await p.waitForTimeout(250);
   const s=await p.evaluate(()=>{
    const contact=document.querySelector('#contact'),overview=document.querySelector('#projects .orbit-overview');
    const rect=overview.getBoundingClientRect();
    return {top:rect.top,height:rect.height,footerTop:contact.getBoundingClientRect().top,front:!!document.elementFromPoint(innerWidth/2,innerHeight-2)?.closest('#contact'),position:getComputedStyle(overview).position,transform:getComputedStyle(document.querySelector('.signature-footer')).transform,overflow:document.documentElement.scrollWidth-innerWidth,phase:document.querySelector('#projects').dataset.entryPhase};
   });
   assert.ok(Math.abs(s.top)<2,JSON.stringify(s));assert.equal(s.position,'fixed');assert.equal(s.front,true);assert.equal(s.overflow,0);assert.equal(s.transform,'none');
   assert.ok(Math.abs(s.footerTop-height*(1-cover))<2);assert.equal(s.phase,'idle');samples.push({cover,...s});
   if(cover===.5&&samples.length===3)await p.screenshot({path:`artifacts/footer-cover-${width}-${reduced}.png`});
  }
  await p.evaluate(y=>scrollTo(0,y),top);await p.waitForTimeout(2200);
  assert.equal(await p.locator('#projects .orbit-overview').evaluate(e=>e.inert),true);
  await p.locator('.footer-back-to-top').click();
  await p.waitForFunction(()=>scrollY<5&&!document.documentElement.classList.contains('is-colonnade-transitioning'),{},{timeout:20000});
  assert.equal(await p.locator('body').evaluate(e=>e.style.overflow==='hidden'),false);
  results.push({width,height,reduced,samples});console.log('PASS',width,height,reduced);await p.close();
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile('artifacts/footer-cover-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
