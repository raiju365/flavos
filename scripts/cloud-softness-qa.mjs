import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const directory='artifacts/cloud-softness',results=[],errors=[];
await mkdir(directory,{recursive:true});
let page;
try {
  page=await browser.newPage({viewport:{width:1440,height:900},recordVideo:{dir:`${directory}/video`,size:{width:1440,height:900}}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.QA_URL||'http://127.0.0.1:4173/');
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,700]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(800);
    await page.evaluate(()=>{
      const probe=document.createElement('canvas');probe.width=48;probe.height=32;
      const context=probe.getContext('2d',{willReadFrequently:true});
      const overlay=document.querySelector('.colonnade-overlay'),source=overlay.querySelector('.cloud-return-canvas');
      window.cloudSoftFrames=[];window.cloudSoftDone=false;
      let started=false,start=0,previous=0;
      document.querySelector('.footer-return-sticker').addEventListener('click',()=>{started=true;start=performance.now();},{once:true});
      const sample=now=>{
        if(started&&now-previous>=30){
          previous=now;context.clearRect(0,0,48,32);context.drawImage(source,0,0,48,32);
          const pixels=context.getImageData(0,0,48,32).data;
          let alpha=0;for(let index=3;index<pixels.length;index+=4)alpha+=pixels[index];
          window.cloudSoftFrames.push({ms:now-start,phase:overlay.dataset.cloudPhase,progress:+overlay.dataset.cloudProgress,
            alpha:alpha/(48*32*255),grade:+overlay.dataset.cloudGradeVisible,frame:+overlay.dataset.cloudFrame,
            active:overlay.classList.contains('is-active')});
        }
        if(!window.cloudSoftDone)requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
    });
    await page.locator('.footer-return-sticker').click();
    await page.waitForFunction(()=>{const overlay=document.querySelector('.colonnade-overlay');return overlay.dataset.cloudPhase==='cover'&&+overlay.dataset.cloudProgress>.08;});
    await page.screenshot({path:`${directory}/entry-${width}.png`});
    await page.evaluate(()=>document.querySelector('.footer-return-sticker').click());
    await page.waitForFunction(()=>{const overlay=document.querySelector('.colonnade-overlay');return overlay.dataset.cloudPhase==='reveal'&&+overlay.dataset.cloudProgress>.3;});
    await page.screenshot({path:`${directory}/reveal-${width}.png`});
    await page.waitForFunction(()=>{const overlay=document.querySelector('.colonnade-overlay');return overlay.dataset.cloudPhase==='reveal'&&+overlay.dataset.cloudProgress>.72;});
    await page.screenshot({path:`${directory}/tail-${width}.png`});
    await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(100);
    const frames=await page.evaluate(()=>{window.cloudSoftDone=true;return window.cloudSoftFrames;});
    const cover=frames.filter(frame=>frame.phase==='cover'&&frame.active);
    const reveal=frames.filter(frame=>frame.phase==='reveal'&&frame.active);
    assert.ok(cover.length>10&&reveal.length>10);
    assert.ok(cover[0].alpha<.025,'Cloud entry begins almost transparent');
    assert.ok(cover.some(frame=>frame.alpha>.98),'Scroll swap is fully covered');
    assert.ok(reveal.some(frame=>frame.progress>.4&&frame.progress<.65&&frame.alpha>.04),'Clouds persist into the middle of hero assembly');
    assert.ok(reveal.at(-1).alpha<.002,'Clouds are already transparent before overlay removal');
    let maximumStep=0;
    for(let index=1;index<frames.length;index++) {
      if(frames[index].ms-frames[index-1].ms<100)maximumStep=Math.max(maximumStep,Math.abs(frames[index].alpha-frames[index-1].alpha));
    }
    assert.ok(maximumStep<.16,`No abrupt density jump: ${maximumStep}`);
    const final=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,inert:document.querySelector('#main-content').inert,
      imageCount:document.querySelectorAll('.footer-return-sticker-image').length,flightChildren:document.querySelector('.footer-return-peel').childElementCount,
      frame:document.querySelector('.colonnade-overlay').dataset.cloudFrame}));
    assert.equal(final.overflow,0);assert.equal(final.inert,false);assert.equal(final.imageCount,1);assert.equal(final.flightChildren,0);
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.colonnade-overlay').getAttribute('data-cloud-frame'),final.frame,'Idle cloud renderer is stopped');
    results.push({width,height,maximumStep,final,frames});
    console.log(`PASS ${width}: soft entry, continuous covered handoff, long dissipation, repeat-click guard, cleanup`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.waitForTimeout(450);
  await page.locator('.footer-return-sticker').click();
  await page.waitForFunction(()=>scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  assert.equal(await page.locator('.footer-return-sticker-image').count(),1);
  results.push({reducedMotion:true,completed:true});
  assert.deepEqual(errors,[]);
  console.log('PASS reduced motion; zero browser errors');
} finally {
  if(page&&!page.isClosed())await page.close();
  await writeFile(`${directory}/qa.json`,JSON.stringify({results,errors},null,2));
  await browser.close();
}
