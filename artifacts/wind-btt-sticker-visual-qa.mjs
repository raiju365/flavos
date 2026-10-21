import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[],states=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
  await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(e=>/\/deps\/gsap\.js/.test(e.name))?.name;
    if(!url)throw Error('GSAP module URL unavailable');
    window.qaGsap=(await import(url)).gsap;
    scrollTo(0,document.documentElement.scrollHeight);
  });
  await page.waitForFunction(()=>document.querySelector('.footer-return-sticker').classList.contains('is-sticker-visible'));
  const animations=await page.locator('.footer-return-sticker-paper').evaluate(el=>el.getAnimations().map(animation=>animation.animationName));
  assert.ok(animations.includes('footer-sticker-attach'));assert.ok(animations.includes('footer-sticker-rest'));
  await page.waitForTimeout(1000);
  await page.evaluate(()=>{
    window.qaStops=[.25,.62,.88];window.qaStop=null;
    const sample=()=>{
      const canvas=document.querySelector('.footer-return-peel');
      if(window.qaStops.length&&Number(canvas.dataset.flight)>=window.qaStops[0]&&!window.qaStop){
        window.qaStop=window.qaStops.shift();window.qaGsap.globalTimeline.pause();
      }
      if(window.qaStops.length||!window.qaStop)requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  });
  await page.locator('.footer-return-sticker').click();
  for(const label of ['wind-cover','wind-hero-reveal','wind-final-gust']){
    await page.waitForFunction(()=>window.qaStop!==null);
    const state=await page.evaluate(()=>({stop:window.qaStop,canvas:{...document.querySelector('.footer-return-peel').dataset},overlay:{...document.querySelector('.colonnade-overlay').dataset}}));
    states.push(state);await page.screenshot({path:`artifacts/btt-${label}-390.png`});
    await page.evaluate(()=>{window.qaStop=null;window.qaGsap.globalTimeline.resume();});
  }
  await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  assert.equal(states[1].overlay.phase,'reveal');assert.equal(states[1].canvas.phase,'flying');
  assert.deepEqual(errors,[]);
  console.log('PASS entry/rest animations and rendered wind flight through cover, hero reveal and exit');
}finally{await writeFile('artifacts/wind-btt-sticker-visual-qa.json',JSON.stringify({states,errors},null,2));await browser.close();}
