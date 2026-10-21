import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const only=Number(process.argv[2]);
const remaining=process.argv.includes('--remaining');
const cases=[[1440,900,false],[820,1000,false],[390,844,false],[320,640,false],[390,844,true]];
const results=[],errors=[];
let page;
try{
 for(const[width,height,reduced]of cases){
  if(only&&width!==only)continue;
  if(remaining&&width===1440)continue;
  const videoStartClock=Date.now();
  page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference',...(width===1440?{recordVideo:{dir:'artifacts/wind-btt-sticker-video',size:{width,height}}}:{})});
  page.setDefaultTimeout(18000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error'||/peel unavailable/.test(e.text()))errors.push(e.text());});
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.querySelector('.footer-signature').dataset.signatureReady==='true',undefined,{timeout:45000});
  await page.waitForTimeout(650);
  const label=`${width}${reduced?'-reduced':''}`;
  const link=page.locator('.footer-return-sticker');
  const bounds=await link.boundingBox();
  assert.ok(bounds.x>width*.5&&bounds.y>height*.3,JSON.stringify(bounds));
  assert.ok(bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height);
  assert.equal(await link.evaluate(el=>getComputedStyle(el).mixBlendMode),'normal');
  assert.equal(await link.locator('img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.waitForTimeout(300);
  await page.screenshot({path:`artifacts/wind-btt-sticker-${label}-footer.png`});
  await page.evaluate(()=>{
   window.returnStickerFrames=[];window.samplingReturn=true;
   const tick=()=>{if(!window.samplingReturn)return;const canvas=document.querySelector('.footer-return-peel'),o=document.querySelector('.colonnade-overlay');window.returnStickerFrames.push({time:performance.now(),scroll:scrollY,peel:{...canvas.dataset},beat:o.dataset.cloudBeat,phase:o.dataset.phase,sourceHidden:document.querySelector('.footer-return-sticker').classList.contains('is-peeled'),canvasVisible:canvas.classList.contains('is-active')});requestAnimationFrame(tick);};requestAnimationFrame(tick);
  });
  const start=(Date.now()-videoStartClock)/1000;
  assert.equal(await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('.footer-return-sticker')),{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}),true);
  await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  if(!reduced){
   await page.waitForFunction(()=>Number(document.querySelector('.footer-return-peel').dataset.peel)>.3&&document.querySelector('.footer-return-peel').dataset.phase==='peeling');
   await page.screenshot({path:`artifacts/wind-btt-sticker-${label}-peeling.png`});
   await page.evaluate(()=>document.querySelector('.footer-return-sticker').click());
   await page.keyboard.press('PageDown');
  }
  await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning')&&scrollY<1);
  await page.waitForTimeout(200);
  const final=await page.evaluate(()=>({hash:location.hash,scroll:scrollY,overflow:document.documentElement.style.overflow,inert:document.querySelector('#main-content').inert,focus:document.activeElement.id,overlay:{...document.querySelector('.colonnade-overlay').dataset},peel:{...document.querySelector('.footer-return-peel').dataset},sourceHidden:document.querySelector('.footer-return-sticker').classList.contains('is-peeled'),overflowX:document.documentElement.scrollWidth-innerWidth}));
  assert.equal(final.hash,'#hero');assert.equal(final.inert,false);assert.equal(final.overflow,'');assert.equal(final.focus,'hero-heading');assert.equal(final.peel.phase,'idle');assert.equal(final.sourceHidden,false);assert.ok(final.overflowX<=1);
  const frames=await page.evaluate(()=>{window.samplingReturn=false;return window.returnStickerFrames;});
  if(!reduced){
   assert.ok(frames.some(f=>f.peel.phase==='peeling'&&Number(f.peel.peel)>.1&&Number(f.peel.peel)<.9));
   assert.ok(frames.some(f=>f.peel.phase==='flying'&&Number(f.peel.flight)>0));
   assert.ok(frames.some(f=>f.phase==='reveal'&&f.canvasVisible&&Number(f.peel.flight)>.5),'sticker stays visible over the hero reveal');
   const windFrames=frames.filter(f=>f.peel.phase==='flying'&&Number(f.peel.flight)<.85);
   assert.ok(Math.max(...windFrames.map(f=>Number(f.peel.x)))-Math.min(...windFrames.map(f=>Number(f.peel.x)))>width*.2,'wind carries the sticker across the screen');
   assert.ok(frames.filter(f=>f.peel.phase==='departed'&&f.phase==='cover').every(f=>f.sourceHidden),'departed artwork never reappears before cover');
  }
  await page.screenshot({path:`artifacts/wind-btt-sticker-${label}-settled.png`});
  const duration=(Date.now()-videoStartClock)/1000-start;
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(450);
  assert.equal(await link.evaluate(el=>getComputedStyle(el.querySelector('img')).visibility),'visible');
  if(width===390&&!reduced){
    await link.evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.footer-return-peel').dataset.phase==='peeling');
    await page.setViewportSize({width:360,height:780});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning')&&scrollY<1);
    assert.equal(await link.evaluate(el=>el.classList.contains('is-peeled')||el.hasAttribute('aria-busy')),false);
    assert.equal(await page.evaluate(()=>document.querySelector('#main-content').inert),false);
  }
  results.push({width,height,reduced,bounds,final,frames});
  const video=page.video();await page.close();page=null;
  if(video){await video.saveAs('artifacts/wind-btt-sticker-preview-raw.webm');await writeFile('artifacts/wind-btt-sticker-preview.json',JSON.stringify({start,duration},null,2));}
  console.log('PASS bottom-right sticker, peel, departure, cloud return and cleanup',label);
 }
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:'artifacts/wind-btt-sticker-failure.png'}).catch(()=>{});await writeFile('artifacts/wind-btt-sticker-failure.json',JSON.stringify(await page.evaluate(()=>({scroll:scrollY,overlay:document.querySelector('.colonnade-overlay')?.dataset,peel:document.querySelector('.footer-return-peel')?.dataset,frames:window.returnStickerFrames})),null,2));}throw error;}
finally{await writeFile(`artifacts/wind-btt-sticker-qa${only?`-${only}`:''}.json`,JSON.stringify({results,errors},null,2));await browser.close();}


