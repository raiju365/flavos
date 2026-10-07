import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],states=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.evaluate(()=>scrollTo(0,scrollY+document.querySelector('#projects').getBoundingClientRect().top-innerHeight*4.9));
await page.waitForTimeout(4200);
async function state(){return page.evaluate(()=>({p:+document.querySelector('#projects').dataset.entryProgress,frameY:document.querySelector('.portrait-orbit').getBoundingClientRect().y,fixed:document.querySelector('.orbit-overview').classList.contains('is-emerging'),inert:document.querySelector('.orbit-overview').inert,overflow:document.documentElement.scrollWidth-innerWidth,workTop:document.querySelector('#projects').getBoundingClientRect().top}));}
for(let i=0;i<21;i++){await page.mouse.wheel(0,220);await page.waitForTimeout(160);states.push(await state());}
await page.waitForTimeout(800);
const landed=await state();assert.equal(landed.fixed,false);assert.equal(landed.inert,false);
await page.screenshot({path:'artifacts/gallery-follow-landed.png'});
for(let i=0;i<21;i++){await page.mouse.wheel(0,-220);await page.waitForTimeout(160);}
await page.waitForTimeout(800);
const reversed=await state();assert.ok(reversed.p<.15);assert.ok(reversed.frameY>0);
assert.ok(states.some(s=>s.p>.5&&s.p<.9&&s.frameY<0));
assert.ok(states.every(s=>s.overflow===0));assert.deepEqual(errors,[]);
await writeFile('artifacts/gallery-follow-wheel-qa.json',JSON.stringify({states,landed,reversed,errors},null,2));
console.log('PASS: wheel descent, frame departure, Work release, reverse restoration');
await browser.close();
