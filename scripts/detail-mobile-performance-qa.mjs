import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const label=process.argv[2] || 'after';
try{const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.locator('.studio-link[href="#projects"]').click();await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.waitForTimeout(1200);
const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.evaluate(()=>{window.qaStart=performance.now();window.qaFrames=[];let last=performance.now();window.qaRaf=function(t){qaFrames.push(t-last);last=t;window.qaId=requestAnimationFrame(qaRaf)};window.qaId=requestAnimationFrame(qaRaf);});
await page.touchscreen.tap(195,422);await page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
const result=await page.evaluate(()=>{cancelAnimationFrame(qaId);return {ms:performance.now()-qaStart,maxFrame:Math.max(...qaFrames),framesOver50:qaFrames.filter(t=>t>50).length,resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/karya/')&&!e.name.includes('/thumbs/')).map(e=>({url:e.name,bytes:e.encodedBodySize})),number:document.querySelector('.orbit-detail-number')?.textContent,border:getComputedStyle(document.querySelector('.orbit-detail-context')).borderTopWidth,cursorParent:document.querySelector('#custom-cursor').parentElement.tagName};});
await page.screenshot({path:`artifacts/detail-mobile-${label}.png`});await writeFile(`artifacts/detail-mobile-${label}.json`,JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}

