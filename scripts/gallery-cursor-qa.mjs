import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.locator('.studio-link[href="#projects"]').click();
await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.mouse.move(700,740);await page.waitForTimeout(200);
assert.equal(await page.locator('.orbit-stage').evaluate(el=>getComputedStyle(el).cursor),'none');
assert.equal(await page.locator('#custom-cursor').evaluate(el=>getComputedStyle(el).opacity),'1');
const angle=await page.locator('.orbit-stage').getAttribute('data-angle');
await page.mouse.down();await page.mouse.move(1000,740,{steps:12});
assert.ok(await page.locator('.orbit-stage').evaluate(el=>el.classList.contains('is-dragging')));
assert.equal(await page.locator('.orbit-stage').evaluate(el=>getComputedStyle(el).cursor),'none');
assert.ok(await page.locator('.orbit-card').evaluateAll(els=>els.every(el=>getComputedStyle(el).cursor==='none')));
await page.mouse.up();await page.waitForTimeout(200);
assert.notEqual(await page.locator('.orbit-stage').getAttribute('data-angle'),angle);
assert.equal(await page.locator('.orbit-stage').evaluate(el=>el.classList.contains('is-dragging')),false);
console.log('PASS: native cursor hidden on stage/cards and during drag; custom cursor visible; drag rotates and releases');
}finally{await browser.close();}
