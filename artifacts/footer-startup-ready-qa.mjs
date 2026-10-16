import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.QA_BASE || 'http://localhost:5173/';
const results=[], errors=[];
try {
  for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,640]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference'});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.signatureStartup={violations:[],ready:null,opening:null};
      const check=()=>{
        const host=document.querySelector('.footer-signature'), loader=document.querySelector('#loading-screen');
        const ready=host?.dataset.signatureReady;
        if(ready&&!signatureStartup.ready) signatureStartup.ready={time:performance.now(),y:scrollY,footerTop:host.closest('.signature-footer').getBoundingClientRect().top,width:host.querySelector('canvas')?.width};
        if(loader?.dataset.phase==='opening'&&!signatureStartup.opening) signatureStartup.opening={time:performance.now(),ready};
        if((window.isMainPageReady||loader?.dataset.phase==='opening')&&ready!=='true'&&ready!=='poster') signatureStartup.violations.push({time:performance.now(),ready});
        requestAnimationFrame(check);
      }; requestAnimationFrame(check);
    });
    if(width===1440){
      await page.route(/footer-signature-3d(?:\.js|-[^/]+\.js)/,async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,700));await route.fulfill({response});});
      await page.route('**/footer/stickers/web/*',async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,2200));await route.fulfill({response});});
    }
    await page.goto(base,{waitUntil:'domcontentloaded'});
    if(width===1440){
      await page.waitForSelector('.footer-signature-canvas',{state:'attached'});await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>window.isMainPageReady),false,'loader holds while stickers are delayed');
      assert.notEqual(await page.locator('#loading-screen').getAttribute('data-phase'),'opening');
      await page.screenshot({path:'artifacts/footer-startup-delayed-stickers.png'});
    }
    const ready=()=>page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
    await ready();
    const initial=await page.evaluate(()=>signatureStartup);
    assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'),'true');
    assert.equal(await page.locator('.footer-signature').getAttribute('data-stickers-loaded'),'6');
    assert.equal(await page.locator('.footer-signature > img').evaluate(el=>getComputedStyle(el).opacity),'0');
    assert.ok(initial.ready.width>100,'first frame has the real responsive size');
    assert.ok(initial.ready.footerTop>height,'3D is rendered while footer is still offscreen');
    assert.equal(initial.ready.y,0);
    assert.deepEqual(initial.violations,[]);
    assert.equal(initial.opening.ready,'true');
    await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(300);
    await page.screenshot({path:`artifacts/footer-startup-ready-${width}.png`});
    await page.waitForTimeout(500);await page.reload({waitUntil:'commit'});await ready();
    assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'),'true');
    assert.ok(await page.evaluate(()=>scrollY)>height,'reload restores the footer only after its 3D frame is ready');
    assert.deepEqual(await page.evaluate(()=>signatureStartup.violations),[]);
    assert.equal(await page.evaluate(()=>signatureStartup.opening.ready),'true');
    results.push({width,cold:initial,reload:true});console.log('PASS eager 3D startup + footer reload',width);
    await page.close();
  }
  for(const scenario of ['retry','no-webgl']){
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    let fail=scenario==='retry';
    if(fail)await page.route('**/footer/stickers/web/SMILE.webp',route=>fail?route.abort('failed'):route.continue());
    else await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};
    });
    await page.goto(base,{waitUntil:'domcontentloaded'});
    if(fail){
      await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.phase==='error');
      assert.equal(await page.evaluate(()=>window.isMainPageReady),false);
      fail=false;await page.locator('.loader-retry').click();
    }
    await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
    const state=await page.locator('.footer-signature').getAttribute('data-signature-ready');
    assert.equal(state,scenario==='retry'?'true':'poster');
    const poster=await page.locator('.footer-signature > img').evaluate(el=>({complete:el.complete,width:el.naturalWidth,src:el.getAttribute('src'),filter:getComputedStyle(el).filter}));
    assert.ok(poster.complete&&poster.width>0&&poster.src.includes('signature-3d-poster'));
    assert.equal(poster.filter,'none');
    await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(300);
    await page.screenshot({path:`artifacts/footer-startup-${scenario}.png`});
    results.push({scenario,state,poster});console.log('PASS footer startup',scenario);await page.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/footer-startup-ready-qa.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
