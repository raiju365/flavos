import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const b=await chromium.launch({channel:'msedge',headless:true});
try {
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:5180');
await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
await p.evaluate(()=>scrollTo(0,2070));await p.waitForTimeout(500);
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(800);
await p.evaluate(()=>scrollTo(0,844*2.3));await p.waitForTimeout(500);
const state=await p.evaluate(()=>({top:document.querySelector('#hero').getBoundingClientRect().top,paper:document.querySelector('.folio-logo-pause').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth-innerWidth}));
assert.ok(Math.abs(state.top)<2);assert.ok(Math.abs(state.paper-422)<3);assert.equal(state.overflow,0);
await p.evaluate(()=>scrollTo(0,844*1.65));await p.waitForTimeout(1800);
await p.locator('.studio-link[href="#about"]').click();
await p.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await p.waitForTimeout(1500);
assert.equal(await p.locator('body').evaluate(e=>e.style.overflow==='hidden'),false);
await p.evaluate(()=>scrollTo(0,844*1.65));await p.waitForTimeout(1800);
await p.locator('.studio-link[href="#hero"]').click();
await p.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await p.waitForTimeout(1500);
assert.ok(await p.locator('#hero').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<2));
console.log('PASS resize during cover, About navigation, Home return');
} finally {await b.close()}

