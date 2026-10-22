import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
let passed=false,page;
await mkdir('artifacts/footer-return-response',{recursive:true});
const cases=[{width:1440,height:900},{width:820,height:1000},{width:390,height:844,touch:true,cpu:4},
 {width:320,height:640,touch:true},{width:390,height:844,touch:true,reduced:true},{width:390,height:844,touch:true,noWebGL:true}];
try{
 for(const test of cases){
  if(process.argv[2]&&test.width!==Number(process.argv[2]))continue;
  const label=`${test.width}${test.reduced?'-reduced':test.noWebGL?'-no-webgl':''}`;
  page=await browser.newPage({viewport:{width:test.width,height:test.height},deviceScaleFactor:test.touch?2:1,
    hasTouch:!!test.touch,isMobile:!!test.touch,reducedMotion:test.reduced?'reduce':'no-preference'});
  page.on('pageerror',error=>errors.push({label,message:error.message}));page.setDefaultTimeout(25000);
  if(test.noWebGL)await page.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(1200);
  const link=page.locator('.footer-return-sticker');
  if(test.cpu){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:test.cpu});}
  await page.evaluate(()=>{
    const image=document.querySelector('.footer-return-sticker-image');
    window.qaSource=image;window.qaFlights=[];window.qaClick=null;
    const visual=()=>({rect:image.getBoundingClientRect().toJSON(),src:image.currentSrc,naturalWidth:image.naturalWidth,filter:getComputedStyle(image).filter});
    document.addEventListener('click',event=>{
      if(window.qaClick)return;
      if(!event.composedPath().some(el=>el.classList?.contains('footer-return-sticker')))return;
      window.qaClick={at:performance.now(),before:visual()};
    },true);
    window.addEventListener('click',()=>{if(window.qaClick&&!window.qaClick.after)window.qaClick.after={...visual(),elapsed:performance.now()-window.qaClick.at};});
    const sample=()=>{
      if(window.qaClick){
        const sheet=document.querySelector('.footer-return-peel'),overlay=document.querySelector('.colonnade-overlay');
        window.qaFlights.push({time:performance.now()-window.qaClick.at,phase:sheet.dataset.phase,flight:Number(sheet.dataset.flight),
          x:Number(sheet.dataset.x),y:Number(sheet.dataset.y),peel:Number(sheet.dataset.peel),
          sameImage:sheet.firstElementChild===window.qaSource,src:window.qaSource.currentSrc,overlay:overlay.dataset.phase,active:sheet.classList.contains('is-active')});
      }
      if(!window.qaClick||window.qaFlights.length<1000)requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
  });
  if(test.touch)await link.tap();else await link.click();
  if(!test.reduced){
    await page.waitForFunction(()=>Number(document.querySelector('.footer-return-peel').dataset.flight)>.025);
    await page.screenshot({path:`artifacts/footer-return-response/${label}-launch.png`});
    // Busy input must not duplicate the image or restart the journey.
    await page.evaluate(()=>document.querySelector('.footer-return-sticker').click());
  }
  await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  const report=await page.evaluate(()=>({click:window.qaClick,frames:window.qaFlights,final:{
    returned:document.querySelector('.footer-return-sticker-paper').firstElementChild===window.qaSource,
    imageCount:document.querySelectorAll('.footer-return-sticker-image').length,
    flightChildren:document.querySelector('.footer-return-peel').childElementCount,
    inert:document.querySelector('#main-content').inert,overflow:document.documentElement.style.overflow,
    overflowX:document.documentElement.scrollWidth-innerWidth,phase:document.querySelector('.footer-return-peel').dataset.phase}}));
  await writeFile(`artifacts/footer-return-response/${label}-frames.json`,JSON.stringify(report,null,2));
  assert.equal(report.final.returned,true);assert.equal(report.final.imageCount,1);assert.equal(report.final.flightChildren,0);
  assert.equal(report.final.inert,false);assert.equal(report.final.overflow,'');assert.equal(report.final.phase,'idle');assert.ok(report.final.overflowX<=1);
  if(!test.reduced){
    const {before,after}=report.click;
    assert.equal(after.src,before.src);assert.equal(after.naturalWidth,before.naturalWidth);assert.equal(after.filter,before.filter);
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(after.rect[key]-before.rect[key])<1,`${label} handoff ${key}: ${before.rect[key]} -> ${after.rect[key]}`);
    const moving=report.frames.find(frame=>frame.flight>0&&frame.y<before.rect.y+before.rect.height/2-2);
    assert.ok(moving&&moving.time<180,`${label}: first upward motion ${moving?.time}ms`);
    assert.ok(report.frames.filter(frame=>frame.active).every(frame=>frame.sameImage&&frame.src===before.src),'The original image stays present through flight');
    assert.ok(report.frames.some(frame=>frame.overlay==='reveal'&&frame.active&&frame.flight>.5));
    const covered=report.frames.filter(frame=>frame.overlay==='covered'&&frame.active);
    if(covered.length>1&&covered.at(-1).time-covered[0].time>40)
      assert.ok(covered.at(-1).flight>covered[0].flight,'The sticker keeps moving during the covered destination handoff');
    results.push({label,cpu:test.cpu||1,handlerMs:after.elapsed,firstUpwardMs:moving.time,report});
  }else results.push({label,report});
  console.log('PASS same artwork/geometry, immediate launch, continuous flight and cleanup',label,results.at(-1).firstUpwardMs||'reduced');
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(500);
  assert.equal(await link.locator('img').evaluate(el=>getComputedStyle(el).visibility),'visible');
  if(test.width===390&&!test.reduced&&!test.noWebGL){
    await link.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.footer-return-peel').dataset.phase==='flying');
    await page.setViewportSize({width:360,height:780});await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning'));
    assert.equal(await link.locator('img').count(),1);assert.equal(await page.locator('.footer-return-peel img').count(),0);
  }
  await page.close();page=null;
 }
 assert.deepEqual(errors,[]);passed=true;
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:'artifacts/footer-return-response/failure.png'});throw error;}
finally{await writeFile(`artifacts/footer-return-response/results${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify({passed,results,errors},null,2));await browser.close();}
