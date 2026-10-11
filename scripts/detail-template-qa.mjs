import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { galleryWorks } from '../src/project-gallery-data.js';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results=[], errors=[];
try {
for (const [width,height] of [[1440,900],[820,1000],[390,844],[320,640]]) {
 console.log('viewport',width);
 const page=await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'});
 page.setDefaultTimeout(20000); page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow!=='hidden');
 await page.waitForFunction(()=>!document.querySelector('#loading-screen') || getComputedStyle(document.querySelector('#loading-screen')).display==='none');
 await page.locator('#projects').scrollIntoViewIfNeeded();
 await page.waitForTimeout(2000);
 const card0 = page.locator('.orbit-card[data-index="0"]');
 await card0.focus();
 await page.keyboard.press('Home');
 await page.waitForTimeout(1500);
 await card0.evaluate(el => el.click());
 const idle=()=>page.waitForFunction(()=>document.querySelector('#project-gallery')?.open && document.querySelector('#project-gallery')?.dataset.scenePhase==='idle');
 await idle();
 const count = width === 1440 ? galleryWorks.length : 1;
 for(let i=0;i<count;i++) {
 assert.equal(await page.locator('.orbit-detail-section').count(),4);
 const state=await page.locator('.orbit-detail').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,labels:[...el.querySelectorAll('dt')].map(n=>n.textContent),title:el.querySelector('h3').textContent,images:[...el.querySelectorAll('img')].map(n=>({ok:n.complete&&n.naturalWidth>0,center:n.getBoundingClientRect().x+n.getBoundingClientRect().width/2,ratio:Math.abs(n.getBoundingClientRect().width/n.getBoundingClientRect().height-n.naturalWidth/n.naturalHeight)}))}));
 assert.ok(!state.overflow); assert.deepEqual(state.labels,['Tujuan karya','Konsep desain','Alasan memilih elemen visual','Tools yang digunakan']);
 for(const img of state.images) {assert.ok(img.ok);assert.ok(img.ratio<.01);}
 if(i===0) {
 await page.screenshot({path:`artifacts/detail-template-${width}.png`});
 if(width<1001) {await page.locator('.orbit-detail-section').last().scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/detail-template-${width}-text.png`});}
 }
 results.push({width,index:i,...state}); console.log(width,i,state.title);
 if(i<count-1){await page.locator('.orbit-detail-next').click();await page.waitForTimeout(1500);await idle();}
 }
 await page.locator('.orbit-back').click(); await page.waitForTimeout(1600);
 if(await page.locator('#project-gallery').evaluate(el=>el.open)) await page.keyboard.press('Escape');
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('#project-gallery').evaluate(el=>el.open),false);
 assert.equal(await page.locator('.orbit-travelling-art').count(),0);
 await page.close();
}
assert.deepEqual(errors,[]);await writeFile('artifacts/detail-template-qa.json',JSON.stringify({results,errors},null,2));console.log('PASS',results.length,'detail states; four viewports; navigation, BACK/Escape, images, overflow, runtime errors');
} finally {await browser.close();}

