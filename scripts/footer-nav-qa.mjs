import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const b=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
try{for(const [w,h,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]){
const p=await b.newPage({viewport:{width:w,height:h},reducedMotion:reduced?'reduce':'no-preference'});p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5180');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await p.waitForTimeout(1000);
const top=await p.locator('#contact').evaluate(e=>e.getBoundingClientRect().top+scrollY),samples=[];
for(const progress of [0,.08,.2,.32,.5,.8,1,.8,.5,.2,.08,0]){
await p.evaluate(y=>scrollTo(0,y),top-h*(1-progress));await p.waitForTimeout(200);
const s=await p.evaluate(()=>{const header=document.querySelector('.studio-header'),mark=header.querySelector('.logo-journey-mark'),r=mark.getBoundingClientRect(),t=document.querySelector('.footer-logo-anchor').getBoundingClientRect();return {state:header.dataset.footerJourney,flow:header.dataset.navFlow,x:r.left,y:r.top,dx:r.left-t.left,dy:r.top-t.top,inert:[...header.querySelectorAll('.studio-link')].some(e=>e.inert),overflow:document.documentElement.scrollWidth-innerWidth,moved:[...header.querySelectorAll('.nav-letter')].some(e=>Math.abs(new DOMMatrix(getComputedStyle(e).transform).m41)>.2)};});
assert.equal(s.overflow,0);
if(!reduced){if(progress===.08||progress===.2){assert.equal(s.state,'absorbing');assert.equal(s.flow,'flowing');assert.equal(s.moved,true);}if(progress===.5)assert.equal(s.state,'travelling');}
if(progress===1){assert.equal(s.state,'docked');assert.ok(Math.abs(s.dx)<1&&Math.abs(s.dy)<1,JSON.stringify(s));}
if(progress===0){assert.equal(s.state,'inactive');assert.equal(s.inert,false);}
samples.push({progress,...s});if((progress===.08||progress===.5)&&samples.length<7)await p.screenshot({path:`artifacts/footer-nav-${w}-${reduced}-${progress}.png`});
}
results.push({w,h,reduced,samples});console.log('PASS',w,reduced);await p.close();}assert.deepEqual(errors,[]);}finally{await writeFile('artifacts/footer-nav-qa.json',JSON.stringify({results,errors},null,2));await b.close();}
