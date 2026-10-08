import { createRequire } from 'node:module';
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
await page.mouse.move(1000,700);
for(let i=0;i<5;i++){await page.mouse.wheel(0,400);await page.waitForTimeout(400);}
await page.waitForFunction(()=>document.querySelector('.footer-headline').dataset.arrival==='complete');
await page.waitForFunction(()=>document.querySelector('.studio-header').dataset.footerJourney==='docked');
await page.screenshot({path:'artifacts/contact-arrival-organic.png'});
for(let i=0;i<5;i++){await page.mouse.wheel(0,-400);await page.waitForTimeout(400);}
await page.waitForFunction(()=>document.querySelector('.studio-header').dataset.footerJourney==='inactive');
assert.equal(await page.locator('.studio-link[href="#contact"]').evaluate(el=>el.closest('[inert]')),null);
console.log('PASS organic arrival, docked logo, reverse scroll and restored navigation');
}finally{await browser.close();}
