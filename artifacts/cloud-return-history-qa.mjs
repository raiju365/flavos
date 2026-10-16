import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[],expectedFallbackDiagnostics=[];
let page;
const inspect=()=>page.evaluate(()=>{const overlay=document.querySelector('.colonnade-overlay'),hero=document.querySelector('#hero'),about=document.querySelector('#about'),contact=document.querySelector('#contact');return{hash:location.hash,y:scrollY,inert:document.querySelector('#main-content').inert,overflow:document.documentElement.style.overflow,busy:document.documentElement.classList.contains('is-colonnade-transitioning'),ready:document.documentElement.classList.contains('is-colonnade-ready'),overlay:{...overlay.dataset},overlayVisible:getComputedStyle(overlay).visibility,hero:{...hero.dataset},aboutTop:about.getBoundingClientRect().top,contactTop:contact.getBoundingClientRect().top,focus:document.activeElement.id,journey:document.querySelector('.studio-header').dataset.footerJourney,overflowX:document.documentElement.scrollWidth-innerWidth};});
const ready=()=>page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});
const settled=hash=>page.waitForFunction(hash=>location.hash===hash&&!document.documentElement.classList.contains('is-colonnade-transitioning'),hash,{timeout:18000});
const footer=async()=>{await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(650);};
const clickReturn=async()=>{const box=await page.locator('.footer-back-to-top').boundingBox();assert.ok(box);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
const assertUnlocked=state=>{assert.equal(state.inert,false);assert.equal(state.overflow,'');assert.equal(state.busy,false);assert.equal(state.ready,false);assert.equal(state.overlay.phase,'idle');assert.equal(state.overlayVisible,'hidden');assert.ok(state.overflowX<=1);};
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(18000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});await ready();
 // Prime a genuine browser history entry at the naturally scrolled footer.
 await footer();await page.evaluate(()=>history.pushState({qa:'footer'},'','#contact'));
 await clickReturn();await settled('#hero');await page.waitForTimeout(100);
 const cloud=await inspect();assertUnlocked(cloud);assert.ok(cloud.y<1);assert.equal(cloud.hero.returnAssembly,'1.0000');assert.equal(cloud.focus,'hero-heading');
 results.push({case:'cloud-return',state:cloud});
 await page.goBack();await settled('#contact');await page.waitForTimeout(150);
 const back=await inspect();assertUnlocked(back);assert.ok(Math.abs(back.contactTop)<3);assert.equal(back.focus,'contact-heading');results.push({case:'normal-back-to-contact',state:back});
 await page.goForward();await settled('#hero');await page.waitForTimeout(150);
 const forward=await inspect();assertUnlocked(forward);assert.ok(forward.y<1);assert.equal(forward.hero.entryPhase,'white');assert.equal(forward.focus,'hero-heading');results.push({case:'normal-forward-to-hero',state:forward});
 console.log('PASS normal cloud return, browser Back to Contact, Forward to Home');
 // Back during cover must resolve the pending history destination after return.
 await page.evaluate(()=>{history.pushState({qa:'about'},'','#about');history.pushState({qa:'footer-pending'},'','#contact');});
 await footer();await clickReturn();await page.waitForFunction(()=>{const o=document.querySelector('.colonnade-overlay');return o.dataset.phase==='cover'&&Number(o.dataset.cloudProgress)>.12;});
 const covering=await inspect();await page.goBack();await settled('#about');await page.waitForTimeout(150);
 const pending=await inspect();assertUnlocked(pending);assert.ok(Math.abs(pending.aboutTop)<3,JSON.stringify(pending));assert.equal(pending.focus,'about');results.push({case:'back-during-cloud-cover-to-about',covering,state:pending});
 await page.screenshot({path:'artifacts/cloud-return-history-about-settled.png'});console.log('PASS browser Back during cloud cover settles pending About destination');
 await page.close();
 page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(18000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()!=='error')return;const message=e.text();if(message==='THREE.WebGLRenderer: THREE.WebGLRenderer: Error creating WebGL context.')expectedFallbackDiagnostics.push(message);else errors.push(message);});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});await ready();await footer();await clickReturn();await settled('#hero');await page.waitForTimeout(100);
 const fallback=await inspect();assertUnlocked(fallback);assert.ok(fallback.y<1);assert.equal(fallback.hero.entryPhase,'white');assert.equal(fallback.hero.returnAssembly,'1.0000');assert.equal(await page.locator('.hero-aperture').getAttribute('data-renderer'),'fallback');results.push({case:'390-no-webgl-fallback-return',state:fallback});await page.screenshot({path:'artifacts/cloud-return-history-fallback-settled.png'});console.log('PASS 390 no-WebGL canvas fallback return');
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){results.push({case:'failure',message:error.message,state:await inspect().catch(()=>null)});await page.screenshot({path:'artifacts/cloud-return-history-failure.png'}).catch(()=>{});}throw error;}
finally{await writeFile('artifacts/cloud-return-history-qa.json',JSON.stringify({results,errors,expectedFallbackDiagnostics},null,2));await browser.close();}
