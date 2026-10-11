import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try {for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,640]]){
if(process.argv[2] && width !== Number(process.argv[2])) continue;
const page=await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(1800);
assert.ok(await page.locator('.signature-footer').evaluate(el=>getComputedStyle(el).backgroundImage.includes('linear-gradient')));
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
const sample = () => page.locator('.footer-flow').evaluate(c => c.toDataURL());
const before = await sample();
await page.screenshot({path:`artifacts/footer-gradient-${width}.png`});
await page.waitForTimeout(5000);
const after = await sample();
if(width===320) assert.equal(before,after,'reduced motion stays still');
else assert.notEqual(before,after,'gradient changes over time');
await page.screenshot({path:`artifacts/footer-flow-${width}-later.png`});await page.locator('.footer-direct').first().focus();assert.ok(await page.locator('.footer-direct').first().evaluate(el=>el===document.activeElement));
await page.locator('.footer-back-to-top').click();await page.waitForTimeout(2200);console.log('PASS',width,await page.evaluate(()=>({hash:location.hash,scroll:scrollY})));
const stopped = await sample(); await page.waitForTimeout(600); assert.equal(stopped,await sample(),'offscreen animation pauses'); await page.close();}assert.deepEqual(errors,[]);}finally{await browser.close();}
