import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:false});
const errors=[],results=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.QA_URL || 'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:120000});
 await page.locator('.studio-link[href="#about"]').click();
 await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(1000);
 const sample=()=>page.evaluate(()=>({timeOrigin:performance.timeOrigin,y:scrollY,visibility:document.visibilityState,loader: document.querySelector('#loading-screen') ? 'present' : 'removed',nav:performance.getEntriesByType('navigation')[0].type,discarded:document.wasDiscarded,hash:location.hash}));
 const before=await sample();
 const cdp=await context.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false}); const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
 await page.waitForTimeout(1000);const hidden=await sample();
 await cdp.send('Page.setWebLifecycleState',{state:'frozen'});
 await other.waitForTimeout(10000);
 await cdp.send('Page.setWebLifecycleState',{state:'active'});
 await page.bringToFront();await page.waitForTimeout(1500);
 const after=await sample();results.push({before,hidden,after,sameDocument:before.timeOrigin===after.timeOrigin,scrollDelta:after.y-before.y});
 await page.screenshot({path:'artifacts/tab-resume-desktop.png'});
 console.log(JSON.stringify({results,errors},null,2));
}finally{await writeFile('artifacts/tab-resume-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}


