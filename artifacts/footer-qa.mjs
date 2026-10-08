import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true});
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
try {
for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,700]]) {
 await page.setViewportSize({width,height});
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow!=='hidden');
 await page.locator('.studio-link[href="#contact"]').click();
 await page.waitForFunction(()=>location.hash==='#contact'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(1800);
 console.log(width,await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,font:getComputedStyle(document.querySelector('.footer-headline')).fontFamily,loaded:document.fonts.check('80px "Miracle History"'),journey:document.querySelector('.studio-header').dataset.footerJourney,heading:document.querySelector('.footer-headline').getBoundingClientRect().toJSON(),footer:document.querySelector('.signature-footer').getBoundingClientRect().toJSON()})));
 await page.screenshot({path:`artifacts/footer-get-in-touch-${width}.png`});
 await page.locator('.footer-direct').first().hover(); await page.waitForTimeout(160);
 await page.screenshot({path:`artifacts/footer-hover-${width}.png`});
 await page.waitForTimeout(650);
 console.log('hover',await page.locator('.contact-letter > span').first().evaluate(el=>getComputedStyle(el).transform));
 await page.locator('.footer-back-to-top').click();
 await page.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
 await page.waitForTimeout(1500);
 console.log('return',await page.evaluate(()=>({y:scrollY,journey:document.querySelector('.studio-header').dataset.footerJourney,inert:[...document.querySelectorAll('.studio-link')].some(el=>el.inert)})));
}
await page.emulateMedia({reducedMotion:'reduce'});
await page.locator('.studio-link[href="#contact"]').click();
await page.waitForTimeout(2000);
await page.locator('.footer-direct').first().focus();
console.log('reduced',await page.locator('.contact-letter > span').first().evaluate(el=>({transform:getComputedStyle(el).transform,transition:getComputedStyle(el).transitionDuration})),errors);
} finally {await browser.close();}
