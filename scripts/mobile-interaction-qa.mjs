import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
let page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const cdp=await page.context().newCDPSession(page);
const swipe=async(x,y,dx,dy)=>{
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++) {await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(650);
};
const idle=()=>page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
const nav=async id=>{await page.locator(`.studio-link[href="#${id}"]`).click();await page.waitForFunction(id=>location.hash===`#${id}`&&!document.documentElement.classList.contains('is-colonnade-transitioning'),id);await page.waitForTimeout(1200);};
try {
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden',null,{timeout:120000});
 for(const [width,height] of [[320,480],[390,844],[667,375],[844,390]]) {
  await page.setViewportSize({width,height});await page.waitForTimeout(500);await nav('projects');
  const angle=Number(await page.locator('.orbit-stage').getAttribute('data-angle'));
  await swipe(width*.75,height*.5,-width*.5,0);
  assert.ok(Math.abs(Number(await page.locator('.orbit-stage').getAttribute('data-angle'))-angle)>.1,'horizontal touch rotates cards');
  assert.equal(await page.locator('#project-gallery').evaluate(el=>el.open),false,'drag does not open detail');
  assert.equal(await page.locator('.orbit-stage').evaluate(el=>el.classList.contains('is-dragging')),false);
  const scroll=await page.evaluate(()=>scrollY);
  await swipe(width*.5,height*.65,0,-height*.3);
  assert.ok(await page.evaluate(()=>scrollY)>scroll+20,'vertical touch scrolls through gallery');
  // Return through the actual footer control when the swipe reaches Contact.
  await page.locator('.footer-back-to-top').click();await page.waitForFunction(()=>scrollY<2);await page.waitForTimeout(400);await nav('projects');
  await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.waitForTimeout(800);
  await page.touchscreen.tap(width/2,height/2);await idle();
  let geometry=await page.evaluate(()=>{const el=document.querySelector('.orbit-detail-media img'),r=el.getBoundingClientRect();return {center:r.x+r.width/2,ratio:r.width/r.height,natural:el.naturalWidth/el.naturalHeight,overflow:document.querySelector('.orbit-detail').scrollWidth-document.querySelector('.orbit-detail').clientWidth};});
  assert.ok(Math.abs(geometry.center-width/2)<1);assert.ok(Math.abs(geometry.ratio-geometry.natural)<.003);assert.equal(geometry.overflow,0);
  await page.screenshot({path:`artifacts/mobile/detail-${width}x${height}.png`});
  for(let i=0;i<5;i++){await page.locator('.orbit-detail-next').click();await idle();}
  await page.locator('.orbit-image-viewport').scrollIntoViewIfNeeded();
  const r=await page.locator('.orbit-image-viewport').boundingBox();
  await swipe(r.x+r.width*.8,r.y+r.height*.5,-r.width*.6,0);
  await page.waitForFunction(()=>{const e=document.querySelector('.orbit-image-viewport');return Math.abs(e.scrollLeft-e.clientWidth)<2;});
  await page.locator('.orbit-image-controls button').first().click();await page.waitForFunction(()=>document.querySelector('.orbit-image-viewport').scrollLeft<2);
  await page.locator('.orbit-detail').evaluate(el=>el.scrollTop=el.scrollHeight);await page.waitForTimeout(100);
  const back=await page.locator('.orbit-back').boundingBox();assert.ok(back.y>=0&&back.y+back.height<=height,'Back remains visible after detail scroll');
  await page.screenshot({path:`artifacts/mobile/detail-${width}x${height}-scrolled.png`});
  await page.locator('.orbit-back').click();await page.waitForFunction(()=>!document.querySelector('#project-gallery').open&&document.body.style.overflow!=='hidden');
  assert.equal(await page.evaluate(()=>document.body.style.overflow==='hidden'),false);
  assert.equal(await page.locator('.orbit-travelling-art').count(),0);
  await nav('about');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  assert.ok(await page.locator('.about-reading-word').evaluateAll(es=>es.every(e=>Number(getComputedStyle(e).opacity)>.99)));
  await nav('projects');await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await idle();
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(500);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#project-gallery').open&&document.body.style.overflow!=='hidden');
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(300);
  results.push({width,height,...geometry,touchDrag:true,verticalSwipe:true,touchCarousel:true,backAfterScroll:true,resize:true,reduced:true});console.log('PASS interaction',width,height);
 }
 await page.close();
 page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:false});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden',null,{timeout:120000});
 await nav('projects');await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await idle();
 await page.screenshot({path:'artifacts/mobile/desktop-detail-regression.png'});
 const desktop=await page.locator('.orbit-detail-media img').evaluate(el=>{const r=el.getBoundingClientRect();return {center:r.x+r.width/2,ratio:r.width/r.height,natural:el.naturalWidth/el.naturalHeight};});
 assert.ok(Math.abs(desktop.center-720)<1);assert.ok(Math.abs(desktop.ratio-desktop.natural)<.003);
 await page.locator('.orbit-back').click();await page.waitForFunction(()=>!document.querySelector('#project-gallery').open&&document.body.style.overflow!=='hidden');
 assert.equal(await page.locator('.orbit-travelling-art').count(),0);
 results.push({width:1440,height:900,desktop:true,...desktop});console.log('PASS desktop detail regression');
 assert.deepEqual(errors,[]);
} finally {await writeFile('artifacts/mobile/interactions.json',JSON.stringify({results,errors},null,2));await browser.close();}
