import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:4173/');
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
 await page.evaluate(()=>{const img=document.querySelectorAll('#projects img')[2];const decode=img.decode.bind(img);img.decode=()=>new Promise(resolve=>{window.releaseNavImage=()=>{img.decode=decode;return decode().then(resolve);};});});
 await page.locator('.studio-link[href="#projects"]').click();
 await page.waitForFunction(()=>document.querySelector('.colonnade-overlay').dataset.phase==='covered');
 await page.waitForTimeout(7000);
 report.waiting=await page.evaluate(()=>({phase:document.querySelector('.colonnade-overlay').dataset.phase,hash:location.hash,locked:document.querySelector('#main-content').inert,decodeCalled:typeof window.releaseNavImage==='function'}));
 assert.equal(report.waiting.phase,'covered');assert.ok(report.waiting.locked&&report.waiting.decodeCalled);assert.notEqual(report.waiting.hash,'#projects');
 await page.evaluate(()=>window.releaseNavImage());
 const arrived=id=>page.waitForFunction(id=>location.hash==='#'+id&&!document.documentElement.classList.contains('is-colonnade-transitioning'),id);
 await arrived('projects');
 await page.locator('.studio-link[href="#hero"]').click();await arrived('hero');
 await page.goBack();await arrived('projects');
 report.back=await page.evaluate(()=>({entry:document.querySelector('#projects').dataset.entryProgress,inert:document.querySelector('#main-content').inert,overlay:document.querySelector('.colonnade-overlay').dataset.phase}));
 assert.equal(report.back.entry,'1.0000');assert.equal(report.back.inert,false);assert.equal(report.back.overlay,'idle');
 await page.goForward();await arrived('hero');report.forward=true;
 console.log(JSON.stringify(report));
}finally{await writeFile('artifacts/navbar-readiness-delayed.json',JSON.stringify(report,null,2));await browser.close();}

