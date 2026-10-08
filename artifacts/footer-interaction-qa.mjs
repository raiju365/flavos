import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true});
const page = await browser.newPage();
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
try {
await page.setViewportSize({width:1440,height:900});
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow!=='hidden');
await page.locator('.studio-link[href="#contact"]').click();
await page.waitForFunction(()=>location.hash==='#contact'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.waitForTimeout(1800);
for(const link of await page.locator('.footer-direct').all()) {
 await link.hover(); await page.waitForTimeout(800);
 console.log(await link.getAttribute('aria-label'),await link.locator('.contact-letter > span').first().evaluate(el=>getComputedStyle(el).transform));
 await page.mouse.move(20,20); await page.waitForTimeout(800);
 console.log('restored',await link.locator('.contact-letter > span').first().evaluate(el=>getComputedStyle(el).transform));
}
await page.locator('.footer-back-to-top').hover(); await page.waitForTimeout(900);
console.log('circle',await page.locator('.back-top-orbit circle').evaluate(el=>getComputedStyle(el).strokeDashoffset));
await page.screenshot({path:'artifacts/footer-top-hover.png'});
await page.locator('.footer-direct').first().focus();
await page.keyboard.press('Tab'); console.log('keyboard',await page.locator(':focus').getAttribute('aria-label'));
await page.emulateMedia({reducedMotion:'reduce'});
await page.locator('.studio-link[href="#contact"]').click();
await page.waitForTimeout(2000);
await page.locator('.footer-direct').first().focus();
console.log('reduced',await page.locator('.contact-letter > span').first().evaluate(el=>({transform:getComputedStyle(el).transform,transition:getComputedStyle(el).transitionDuration})),errors);
} finally {await browser.close();}
