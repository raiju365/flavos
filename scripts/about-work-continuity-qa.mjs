import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[],errors=[];
for(const [width,height] of [[1440,900],[820,1000],[390,844],[360,640]]){
 const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
 const seek=async top=>{await page.evaluate(top=>scrollTo(0,scrollY+document.querySelector('#projects').getBoundingClientRect().top-top),top);await page.waitForTimeout(180);};
 // Start after absorption; then let its real timeline finish before testing.
 await seek(height*4.5);await page.waitForTimeout(4000);
 const states=[];
 for(const top of [height*3,height*2,height*.5,1,-1,1,height*.5,height*2,height*3]){
  await seek(top);
  states.push(await page.evaluate(()=>{const c=document.querySelector('.orbit-card').getBoundingClientRect();const f=document.querySelector('.portrait-orbit').getBoundingClientRect();return {card:{x:c.x,y:c.y,w:c.width,h:c.height},frameY:f.y,p:+document.querySelector('#projects').dataset.entryProgress,overflow:document.documentElement.scrollWidth-innerWidth,mask:document.querySelector('.orbit-overview').style.maskImage};}));
 }
 // Fixed-to-document release must not teleport when crossing the boundary.
 assert.ok(Math.abs(states[3].card.y-states[4].card.y)<4,`release jump ${width}`);
 assert.ok(Math.abs(states[4].card.y-states[5].card.y)<4,`reverse release jump ${width}`);
 assert.ok(Math.abs(states[0].frameY-states[8].frameY)<2,`frame reverse ${width}`);
 assert.ok(states.every(s=>s.overflow===0));
 await page.screenshot({path:`artifacts/about-work-smooth-${width}.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
 assert.equal(await page.locator('.orbit-overview').evaluate(el=>el.classList.contains('is-emerging')),false);
 assert.equal(await page.locator('.about-reading-stage').evaluate(el=>parseFloat(getComputedStyle(el).translate)||0),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(800);
 await page.setViewportSize({width:width-10,height:height-20});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 results.push({width,height,states,reducedMotion:true,resize:true});await page.close();
}
assert.deepEqual(errors,[]);await writeFile('artifacts/about-work-continuity-qa.json',JSON.stringify({results,errors},null,2));console.log('PASS: release continuity, reverse, reduced motion and resize at four viewport sizes');await browser.close();
