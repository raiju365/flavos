import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try {
 for(const [width,height,touch] of [[1440,900,false],[390,844,true]]) {
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden',null,{timeout:120000});
  await page.evaluate(()=>{
   window.protectionEvents=[];
   for(const type of ['contextmenu','keydown']) document.addEventListener(type,e=>window.protectionEvents.push({type,key:e.key,prevented:e.defaultPrevented}));
  });
  await page.locator('.studio-link[href="#projects"]').click();
  await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.locator('.orbit-card[data-index="7"]').focus();await page.keyboard.press('Enter');
  const idle=()=>page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
  await idle();
  const img=page.locator('.orbit-detail-media img');
  await img.click({button:'right'});
  await page.keyboard.press('Control+s');await page.keyboard.press('Control+a');await page.keyboard.press('Control+c');
  await page.keyboard.press('Meta+s');
  const state=await page.evaluate(()=>({
   events:window.protectionEvents.filter(e=>e.type==='contextmenu'||['s','a','c'].includes(e.key)),
   image:getComputedStyle(document.querySelector('.orbit-detail-media img')).userSelect,
   title:getComputedStyle(document.querySelector('#orbit-detail-title')).userSelect,
   drag:getComputedStyle(document.querySelector('.orbit-detail-media img')).webkitUserDrag,
   selection:getSelection().toString(),overflow:document.documentElement.scrollWidth-innerWidth,
  }));
  assert.ok(state.events.some(e=>e.type==='contextmenu'));
  assert.ok(state.events.every(e=>e.prevented));assert.equal(state.selection,'');
  assert.equal(state.image,'none');assert.equal(state.title,'none');assert.equal(state.drag,'none');assert.equal(state.overflow,0);
  await page.screenshot({path:`artifacts/content-protection-${width}.png`});
  await page.locator('.orbit-detail-prev').click();await idle();
  await page.locator('.orbit-detail-prev').click();await idle();
  assert.equal(await page.locator('.orbit-image-slide').count(),2);
  await page.locator('.orbit-image-controls button').last().click();
  await page.waitForFunction(()=>{const el=document.querySelector('.orbit-image-viewport');return Math.abs(el.scrollLeft-el.clientWidth)<2;});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#project-gallery').open&&document.body.style.overflow!=='hidden');
  await page.locator('.studio-link[href="#about"]').click();
  await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  const oldY=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,200);await page.waitForTimeout(500);
  assert.ok(await page.evaluate(()=>scrollY)>oldY+30);
  results.push({width,height,...state,carousel:true,escape:true,navigation:true,scroll:true});console.log('PASS content protection',width);
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile('artifacts/content-protection-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
