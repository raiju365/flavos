import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const b=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
const sample=p=>p.evaluate(()=>{const h=document.querySelector('.studio-header'),a=h.querySelector('a[href="#about"]'),r=a.getBoundingClientRect();return {y:scrollY,p:+document.querySelector('#hero').dataset.entryProgress,opacity:+getComputedStyle(h).opacity,inert:h.inert||a.inert,flow:h.dataset.navFlow,hit:!!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a[href="#about"]'),overflow:document.documentElement.scrollWidth-innerWidth,transform:h.querySelector('.nav-letter').style.transform}});
try{for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]){
const p=await b.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
await p.goto('http://localhost:5173');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await p.waitForTimeout(200);
const distance=height*(reduced?.7:1.8);await p.evaluate(y=>scrollTo(0,y),Math.round(distance*.8));await p.waitForTimeout(150);const before=await sample(p);assert.equal(before.opacity,0);assert.equal(before.inert,true);
await p.evaluate(y=>scrollTo(0,y),Math.ceil(distance*.9));await p.waitForTimeout(100);const early=await sample(p);await p.waitForTimeout(320);const middle=await sample(p);await p.waitForTimeout(850);const settled=await sample(p);
assert.equal(early.y,settled.y);if(!reduced){assert.ok(early.opacity>0&&early.opacity<1,JSON.stringify(early));assert.ok(middle.opacity>early.opacity&&middle.opacity<1,JSON.stringify(middle));}assert.equal(settled.opacity,1);assert.equal(settled.inert,false);assert.equal(settled.hit,true);assert.equal(settled.flow,reduced?'reduced':'rest');assert.equal(settled.overflow,0);
await p.screenshot({path:`artifacts/nav-arrival-${width}-${reduced}.png`});
await p.mouse.wheel(0,height*.48);await p.waitForTimeout(1400);const moved=await sample(p);assert.ok(moved.y>settled.y);if(!reduced)assert.equal(moved.flow,'flowing');
await p.evaluate(y=>scrollTo(0,y),Math.ceil(distance*.9));await p.waitForTimeout(400);const returned=await sample(p);assert.equal(returned.inert,false);assert.equal(returned.hit,true);
await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(150);assert.equal((await sample(p)).opacity,0);
await p.evaluate(y=>scrollTo(0,y),Math.ceil(distance*.9));await p.waitForTimeout(1250);await p.locator('.studio-link[href="#about"]').click();await p.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));assert.equal(await p.locator('#main-content').evaluate(e=>e.inert),false);
results.push({width,height,reduced,before,early,middle,settled,moved,returned});console.log('PASS',width,reduced);await p.close();
}assert.deepEqual(errors,[]);}finally{await writeFile('artifacts/nav-arrival-qa.json',JSON.stringify({results,errors},null,2));await b.close();}
