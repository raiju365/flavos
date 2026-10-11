import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const b=await chromium.launch({channel:'msedge',headless:true});
try{const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await p.locator('#contact').scrollIntoViewIfNeeded();await p.waitForTimeout(2500);
assert.equal(await p.locator('.footer-signature-canvas').count(),0);assert.equal(await p.locator('.footer-signature>img').evaluate(el=>getComputedStyle(el).opacity),'1');console.log('PASS no-WebGL image fallback');
}finally{await b.close();}
