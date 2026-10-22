import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];let passed=false,page;
await mkdir('artifacts/cloud-wind',{recursive:true});
try{
 for(const width of [1440,390]){
  if(process.argv[2]&&width!==Number(process.argv[2]))continue;
  const height=width===1440?900:844;
  const recordingAt=Date.now();
  page=await browser.newPage({viewport:{width,height},deviceScaleFactor:width===390?2:1,isMobile:width===390,hasTouch:width===390,
   recordVideo:{dir:'artifacts/cloud-wind/video',size:{width,height}}});
  page.on('pageerror',error=>errors.push(error.message));
  let release,heldResolve;
  const blocker=new Promise(resolve=>release=resolve),held=new Promise(resolve=>heldResolve=resolve);
  await page.route('**/transition/clouds/cumulus-4.webp',async route=>{heldResolve();await blocker;await route.continue();});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await held;
  await page.waitForFunction(()=>['true','poster'].includes(document.querySelector('.footer-signature')?.dataset.signatureReady)
    &&document.querySelector('.logo-style-cycle')?.dataset.assetsLoaded==='10'
    &&[...document.querySelectorAll('#main-content img')].every(image=>image.complete&&image.naturalWidth>0),null,{timeout:90000});
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>!!window.isMainPageReady),false,'New cloud art is ready before the loader opens');release();
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  assert.equal(await page.locator('.colonnade-overlay').getAttribute('data-cloud-sprites-ready'),'4');
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(1000);
  await page.evaluate(()=>{
   window.qaCloudFrames=[];window.qaCloudStarted=false;window.qaCloudDone=false;
   document.querySelector('.footer-return-sticker').addEventListener('click',()=>{window.qaCloudStarted=true;},{once:true});
   const sample=()=>{
    const overlay=document.querySelector('.colonnade-overlay'),sheet=document.querySelector('.footer-return-peel');
    if(window.qaCloudStarted)window.qaCloudFrames.push({at:performance.now(),phase:overlay.dataset.phase,
      progress:Number(overlay.dataset.cloudProgress),clock:Number(overlay.dataset.cloudFlowTime),frame:Number(overlay.dataset.cloudFrame),
      drift:Number(overlay.dataset.cloudDrift),flight:Number(sheet.dataset.flight),x:Number(sheet.dataset.x),y:Number(sheet.dataset.y),angle:Number(sheet.dataset.rotation),wind:Number(sheet.dataset.wind)});
    if(!window.qaCloudDone)requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  const videoStart=Date.now(),clickVideoSeconds=(videoStart-recordingAt)/1000;await page.locator('.footer-return-sticker').click();
  await page.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  const frames=await page.evaluate(()=>{window.qaCloudDone=true;return window.qaCloudFrames;});
  const live=frames.filter(frame=>frame.phase==='cover'&&frame.progress<.95);
  assert.ok(new Set(live.map(frame=>frame.clock)).size>10,'Cloud advection updates throughout cover');
  assert.ok(new Set(live.map(frame=>frame.drift)).size>10,'Cloud crosswind changes independently of camera travel');
  const coveredFrames=frames.filter(frame=>frame.phase==='covered');
  if(coveredFrames.length>1&&coveredFrames.at(-1).at-coveredFrames[0].at>40)assert.ok(coveredFrames.at(-1).clock>coveredFrames[0].clock,'Clouds remain alive during destination preparation');
  const flying=frames.filter(frame=>frame.flight>.1&&frame.flight<.8);
  assert.ok(Math.max(...flying.map(f=>f.angle))-Math.min(...flying.map(f=>f.angle))>.06,'Paper rotation responds to varying air pressure');
  await page.waitForTimeout(100);
  const idleBefore=await page.locator('.colonnade-overlay').getAttribute('data-cloud-frame');await page.waitForTimeout(220);
  assert.equal(await page.locator('.colonnade-overlay').getAttribute('data-cloud-frame'),idleBefore,'Cloud rendering stops after return');
  const video=page.video();await page.close();page=null;const videoPath=`artifacts/cloud-wind/${width}-flight.webm`;await video.saveAs(videoPath);
  for(const [name,progress]of [['early',.17],['middle',.43],['near',.71]]){
    const sample=frames.find(frame=>frame.phase==='cover'&&frame.progress>=progress);
    if(sample)execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(clickVideoSeconds+(sample.at-frames[0].at)/1000),'-i',videoPath,'-frames:v','1',`artifacts/cloud-wind/${width}-${name}.jpg`]);
  }
  results.push({width,height,durationMs:frames.at(-1).at-frames[0].at,clickVideoSeconds,frames});console.log('PASS moving photographic cloud depth, gust response, covered motion and idle pause',width);
 }
 assert.deepEqual(errors,[]);passed=true;
}finally{await writeFile('artifacts/cloud-wind/results.json',JSON.stringify({passed,results,errors},null,2));await browser.close();}
