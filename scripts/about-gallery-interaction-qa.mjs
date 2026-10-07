import {createRequire} from 'node:module';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://localhost:5173/');await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.evaluate(()=>{const el=document.querySelector('#projects');scrollTo(0,scrollY+el.getBoundingClientRect().top-3400)});
await page.mouse.move(20,800);
for(let i=0;i<20;i++){await page.mouse.wheel(0,200);await page.waitForTimeout(160);}
await page.waitForTimeout(700);
await page.locator('.studio-link[href="#projects"]').click();
await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning')&&document.querySelector('#projects').dataset.entryPhase==='idle');
await page.locator('.orbit-card[data-index="0"]').focus();await page.waitForTimeout(500);await page.keyboard.press('Enter');await page.waitForTimeout(1600);
console.log('detail',await page.locator('#project-gallery').evaluate(el=>el.open));
await page.keyboard.press('Escape');await page.waitForTimeout(1600);
console.log('cleanup',await page.evaluate(()=>({open:document.querySelector('#project-gallery').open,overflow:document.body.style.overflow,proxy:document.querySelectorAll('.orbit-travelling-art').length})));
await page.mouse.move(20,800);for(let i=0;i<9;i++){await page.mouse.wheel(0,-200);await page.waitForTimeout(130);}
console.log('reverse',await page.locator('#projects').getAttribute('data-entry-phase'));await browser.close();

