import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try {for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,640]]){
if(process.argv[2] && width !== Number(process.argv[2])) continue;
const page=await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Footer')) console.log(m.text());});
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await page.waitForSelector('.has-signature-3d');await page.waitForTimeout(1800);
assert.equal(await page.locator('.footer-signature').getAttribute('data-footer-contrast'),null);
const state=()=>page.locator('.footer-signature').evaluate(el=>({...el.dataset}));
await page.mouse.move(width*.2,height*.2);await page.waitForTimeout(900);const left=await state();
await page.screenshot({path:`artifacts/footer-3d-${width}-left.png`});
await page.mouse.move(width*.85,height*.8);await page.waitForTimeout(900);const right=await state();
await page.screenshot({path:`artifacts/footer-3d-${width}-right.png`});
if(width===320){assert.equal(left.rotation,right.rotation);assert.equal(left.light,right.light);}
else {assert.notEqual(left.rotation,right.rotation);assert.notEqual(left.light,right.light);const before=await state();await page.waitForTimeout(900);assert.notEqual(before.light,(await state()).light);}
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.footer-direct').first().focus();assert.ok(await page.locator('.footer-direct').first().evaluate(el=>el===document.activeElement));
await page.locator('.footer-back-to-top').click();await page.waitForTimeout(2200);const stopped=await state();await page.waitForTimeout(500);assert.equal(stopped.light,(await state()).light);
assert.equal(await page.evaluate(()=>scrollY),0);console.log('PASS',width,JSON.stringify({left,right}));await page.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
