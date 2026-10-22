import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
await mkdir('artifacts/runtime-performance',{recursive:true});
const cases=[[1440,900,false],[820,1000,false],[390,844,false],[320,640,false],[390,844,true]];
let page;
try{
 for(const [width,height,reduced]of cases){
  if(process.argv[2]&&width!==Number(process.argv[2]))continue;
  page=await browser.newPage({viewport:{width,height},hasTouch:width<=390,isMobile:width<=390,reducedMotion:reduced?'reduce':'no-preference'});
  page.setDefaultTimeout(35000);page.on('pageerror',e=>errors.push({width,message:e.message}));
  await page.addInitScript(()=>{
    window.qaFrames=[];let seen=false,ended=0;
    const tick=()=>{const loader=document.querySelector('#loading-screen');
      if(loader)seen=true;if(seen&&!loader&&!ended)ended=performance.now();
      window.qaFrames.push({y:scrollY,t:performance.now(),loader:Boolean(loader),phase:loader?.dataset.phase,progress:Number(loader?.dataset.revealProgress)||0,
        background:loader?getComputedStyle(loader).backgroundColor:null,fill:loader?.querySelector('.loader-window-cover path')?.getAttribute('fill')});
      if(!ended||performance.now()-ended<600)requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  const ready=()=>page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  await ready();
  const network=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));
  assert.ok(network.some(url=>/footer-signature-3d.*\.js$/.test(url)),'The full startup gate prepares the footer before opening');
  assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'),'true');
  assert.equal(await page.locator('#main-content img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
  if(!reduced)assert.equal(await page.locator('.logo-style-cycle').getAttribute('data-assets-loaded'),'10');
  const checkLayout=async()=>{
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,bodyLock:document.body.style.overflow,rootLock:document.documentElement.style.overflow,inert:document.querySelector('#main-content').inert}));
    assert.ok(state.overflow<=1,JSON.stringify(state));assert.equal(state.inert,false);return state;
  };
  const scrollTo=async id=>{
    await page.locator(`#${id}`).evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top,behavior:'instant'}));
    await page.waitForTimeout(700);
  };
  // Scroll forward and reverse, including the real About / Work handoff.
  await scrollTo('about');await checkLayout();
  assert.equal(await page.locator('.portrait-core').evaluate(el=>getComputedStyle(el).transform),'none');
  await page.locator('.studio-link[href="#projects"]').click();
  await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.waitForFunction(()=>document.querySelector('#projects').dataset.entryPhase==='idle');
  await checkLayout();
  if(width===1440||width===390){
    const card=page.locator('.orbit-card[data-index="0"]');
    await card.evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Home');await page.waitForTimeout(600);await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
    const media=await page.locator('.orbit-detail-media img').first().evaluate(el=>{const r=el.getBoundingClientRect();return {center:r.x+r.width/2,ratio:r.width/r.height,natural:el.naturalWidth/el.naturalHeight,loaded:el.complete&&el.naturalWidth>0};});
    assert.equal(media.loaded,true);assert.ok(Math.abs(media.center-width/2)<1);assert.ok(Math.abs(media.ratio-media.natural)<.004);
    await page.locator('.orbit-detail-next').click();await page.waitForFunction(()=>document.querySelector('#project-gallery').dataset.scenePhase==='idle');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#project-gallery').open);
    assert.equal(await page.locator('.orbit-travelling-art').count(),0);
  }
  await scrollTo('about');
  await page.locator('.studio-link[href="#contact"]').click();
  await page.waitForFunction(()=>location.hash==='#contact'&&!document.documentElement.classList.contains('is-colonnade-transitioning'),null,{timeout:90000});
  await page.waitForFunction(()=>document.querySelector('.footer-signature').dataset.signatureReady==='true');
  assert.equal(await page.locator('.footer-signature').getAttribute('data-stickers-loaded'),'6');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(400);
  const before=await page.evaluate(()=>scrollY);
  await page.reload({waitUntil:'domcontentloaded'});await ready();await page.waitForTimeout(700);
  const refresh=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight,frames:window.qaFrames,journey:document.querySelector('.studio-header').dataset.footerJourney}));
  assert.ok(Math.abs(refresh.y-refresh.max)<2,JSON.stringify({width,before,y:refresh.y,max:refresh.max}));
  assert.equal(refresh.journey,'docked');
  const loading=refresh.frames.filter(f=>f.loader&&f.phase!=='opening');
  assert.ok(loading.length>0);assert.ok(loading.every(f=>f.background==='rgb(0, 0, 0)'));
  const opening=refresh.frames.filter(f=>f.loader&&f.phase==='opening'&&f.progress>.03);
  if(!reduced){assert.ok(opening.length>0);assert.ok(opening.every(f=>f.fill==='rgb(0, 0, 0)'));}
  const exposed=refresh.frames.filter(f=>!f.loader||f.progress>.03);
  assert.ok(exposed.every(f=>Math.abs(f.y-refresh.y)<2),'restored page stays still throughout the reveal');
  await page.screenshot({path:`artifacts/runtime-performance/stable-${width}${reduced?'-reduced':''}-footer.png`});
  if(width===1440||width===390){
    await page.locator('.footer-sticker-trigger').first().evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.sticker-viewer').dataset.phase==='open');
    const canvas=page.locator('.sticker-viewer-canvas');await canvas.focus();
    const rotation=await page.locator('.sticker-viewer').getAttribute('data-rotation');
    await page.keyboard.press('ArrowRight');await page.waitForTimeout(700);
    assert.notEqual(await page.locator('.sticker-viewer').getAttribute('data-rotation'),rotation);
    await page.keyboard.press('Home');await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.sticker-viewer').open);
  }
  await page.locator('.footer-return-sticker').click();
  await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  const final=await checkLayout();assert.equal(final.bodyLock,'');assert.equal(final.rootLock,'');
  results.push({width,height,reduced,before,after:refresh.y,exposedFrames:exposed.length,stable:true,final,network});
  console.log('PASS black loader, stable footer reload, forward/reverse, navigation, gallery, sticker viewer and return',width,reduced);
  await page.close();page=null;
 }
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){
 await page.screenshot({path:'artifacts/runtime-performance/stability-failure.png'}).catch(()=>{});
 console.log('FAIL STATE',await page.evaluate(()=>({url:location.href,y:scrollY,root:document.documentElement.className,overlay:document.querySelector('.colonnade-overlay')?.dataset,scene:document.querySelector('#project-gallery')?.dataset,signature:document.querySelector('.footer-signature')?.dataset})));
}throw error;}finally{await writeFile(`artifacts/runtime-performance/stability${process.argv[2]?'-'+process.argv[2]:''}.json`,JSON.stringify({results,errors},null,2));await browser.close();}
