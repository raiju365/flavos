import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage();const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const sample=()=>page.evaluate(()=>{const s=document.querySelector('.orbit-stage');return {velocity:+s.dataset.rotationVelocity,demand:+s.dataset.rotationDemand,angle:+s.dataset.angle,p:+document.querySelector('#projects').dataset.entryProgress};});
const seek=offset=>page.evaluate(offset=>{const work=document.querySelector('#projects');const stage=document.querySelector('.about-reading-stage');const end=Math.max(innerHeight,stage.getBoundingClientRect().height+parseFloat(stage.style.getPropertyValue('--gallery-stage-top')||0));scrollTo({top:scrollY+work.getBoundingClientRect().top-end+offset,behavior:'instant'});},offset);
for(const [width,height] of [[1440,900],[820,1000],[390,844],[360,640]]){
 await page.setViewportSize({width,height});await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');await page.mouse.move(0,0);
 await seek(5);await page.waitForTimeout(2200);const cruise=await sample();
 await seek(-2);await page.waitForTimeout(65);const lift=await sample();
 await page.waitForTimeout(350);const braking=await sample();
 await page.waitForTimeout(1900);const stopped=await sample();
 assert.ok(cruise.velocity>.06);assert.equal(lift.demand,0);assert.ok(lift.velocity>0 && lift.velocity<cruise.velocity);
 assert.ok(braking.velocity>0 && braking.velocity<lift.velocity);assert.ok(stopped.velocity<.0002);
 assert.ok(stopped.angle>lift.angle);
 await seek(5);await page.waitForTimeout(70);const restarting=await sample();await page.waitForTimeout(2100);const resumed=await sample();
 assert.ok(restarting.velocity>0 && restarting.velocity<.025);assert.ok(resumed.velocity>.06);
 results.push({width,cruise,lift,braking,stopped,restarting,resumed});
}
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);const reduced=await sample();assert.equal(reduced.velocity,0);assert.deepEqual(errors,[]);
await writeFile('artifacts/gallery-rotation-qa.json',JSON.stringify({results,reduced,errors},null,2));console.log(JSON.stringify({results,reduced,errors}));await browser.close();
