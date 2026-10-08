import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[],errors=[];
try {
for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,715]]) {
const page=await browser.newPage({viewport:{width,height}});
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
const span=width>=1200?6:4,hold=width>=1200?2:0;
await page.evaluate(({span,hold})=>{const work=document.querySelector('#projects'),stage=document.querySelector('.about-reading-stage');const end=Math.max(innerHeight,stage.offsetHeight+parseFloat(stage.style.getPropertyValue('--gallery-stage-top')||0));scrollTo({top:scrollY+work.getBoundingClientRect().top-end-innerHeight*(hold+span*.9),behavior:'instant'});},{span,hold});
await page.waitForTimeout(4000);
await page.evaluate(({span,hold})=>{const work=document.querySelector('#projects'),stage=document.querySelector('.about-reading-stage');const end=Math.max(innerHeight,stage.offsetHeight+parseFloat(stage.style.getPropertyValue('--gallery-stage-top')||0));scrollTo({top:scrollY+work.getBoundingClientRect().top-end-innerHeight*(hold+span*.9),behavior:'instant'});},{span,hold});
await page.waitForTimeout(800);await page.mouse.move(20,100);
let previous=.1,previousState;
const states=[];
for(const p of [.1,.3,.5,.7,.9,.7,.5,.3,.1]){
await page.mouse.wheel(0,(p-previous)*height*span);previous=p;
await page.waitForTimeout(850);
const state=await page.evaluate(()=>({p:+document.querySelector('#projects').dataset.entryProgress,
frame:document.querySelector('.portrait-orbit').getBoundingClientRect().y,
angle:+document.querySelector('.orbit-stage').dataset.angle,
cards:[...document.querySelectorAll('.orbit-card')].map(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {z:m.m43,visible:getComputedStyle(el).visibility!=='hidden'};}),
overflow:document.documentElement.scrollWidth-innerWidth,
broken:[...document.querySelectorAll('.orbit-card img')].filter(img=>!img.complete||!img.naturalWidth).length}));
assert.ok(Math.abs(state.p-p)<.006,`real wheel progress ${width}: ${p} vs ${state.p}`);
assert.equal(state.overflow,0);assert.equal(state.broken,0);
if(previousState)for(let i=0;i<state.cards.length;i++)for(let j=i+1;j<state.cards.length;j++){
const a=state.cards[i].z-state.cards[j].z,b=previousState.cards[i].z-previousState.cards[j].z;
if(Math.abs(a)>.01&&Math.abs(b)>.01)assert.ok(a*b>=0,'depth order reversed between wheel samples');
}
previousState=state;states.push(state);
if([.3,.5,.7].includes(p))await page.screenshot({path:`artifacts/penetration-fixed-${width}-${p}.png`});
}
assert.ok(Math.abs(states[0].frame-states.at(-1).frame)<2,'portrait returns on reverse');
await page.setViewportSize({width:width+10,height:height-10});await page.waitForTimeout(500);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
assert.equal(await page.locator('#projects').getAttribute('data-entry-progress'),'1.0000');
results.push({width,height,states,reducedMotion:true,resize:true});console.log('PASS real wheel forward/reverse, depth order, frame return, resize, reduced motion',width);
await page.close();
}
assert.deepEqual(errors,[]);
}finally{await writeFile('artifacts/gallery-penetration-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}

