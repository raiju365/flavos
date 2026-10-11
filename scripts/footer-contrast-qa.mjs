import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [tone,rgb] of [['light','[32,35,91]'],['dark','[248,247,243]']]){
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await page.route('**/src/footer-gradient.js*',async route=>{const r=await route.fetch();let source=await r.text();source=source.replace(/const ink = rgb\([^;]+;/,`const ink = ${rgb};`).replace(/const paper = rgb\([^;]+;/,`const paper = ${rgb};`);await route.fulfill({response:r,body:source});});
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
const states=await page.locator('.footer-direct, .footer-back-to-top').evaluateAll(els=>els.map(e=>({tone:e.dataset.footerContrast,color:getComputedStyle(e).color})));
assert.ok(states.every(s=>s.tone===tone),JSON.stringify(states));
for(const selector of ['.signature-bottom','.footer-back-to-top']) assert.equal(await page.locator(selector).evaluate(e=>getComputedStyle(e,'::before').content),'none');
console.log('PASS controlled background',tone,JSON.stringify(states));await page.close();
}}finally{await browser.close();}

