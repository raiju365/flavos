import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.locator('.studio-link[href="#projects"]').click();await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.waitForTimeout(1200);await page.keyboard.press('Enter');
await page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
await page.locator('.orbit-detail-next').click();await page.waitForFunction(()=>document.querySelector('#project-gallery').dataset.scenePhase==='idle');
await page.locator('.orbit-detail-prev').click();await page.waitForFunction(()=>document.querySelector('#project-gallery').dataset.scenePhase==='idle');
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#project-gallery').open);await page.waitForTimeout(500);
assert.equal(await page.locator('.orbit-travelling-art').count(),0);assert.equal(await page.evaluate(()=>document.body.style.overflow==='hidden'),false);assert.deepEqual(errors,[]);
console.log('PASS keyboard open, next/previous detail, Escape, proxy cleanup and scroll unlock');
}finally{await browser.close();}
