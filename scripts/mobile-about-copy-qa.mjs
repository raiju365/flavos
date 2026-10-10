import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
const text='I’m passionate about how technology and visual design can shape ideas and inspire people. With a background in Informatics and a growing interest in creative media, I love exploring technology, design. I’m eager to keep learning, collaborating, and creating projects.'.toUpperCase();
const nav=async()=>{await page.locator('.studio-link[href="#about"]').click();await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));await page.waitForTimeout(1300);};
const seek=async value=>{
 await page.evaluate(value=>{const e=document.querySelector('#about'),text=[...e.querySelectorAll('.about-reading-copy')].reduce((n,p)=>n+Math.round(p.querySelectorAll('.about-reading-word').length*5.5),0),total=parseFloat(e.style.getPropertyValue('--about-scroll-distance'));scrollTo({top:scrollY+e.getBoundingClientRect().top+(e.offsetHeight-innerHeight)*text*(1+value)/total,behavior:'instant'});},value);
 await page.waitForTimeout(1800);
};
const state=()=>page.evaluate(()=>{
 const photo=document.querySelector('.portrait-orbit').getBoundingClientRect(),copy=document.querySelector('.about-reading-content--right').getBoundingClientRect();
 return {mobile:document.querySelector('#about').classList.contains('has-mobile-copy'),left:getComputedStyle(document.querySelector('.about-reading-content--left')).display,text:document.querySelector('.about-reading-content--right .about-reading-copy').textContent,photo:{x:photo.x,w:photo.width,y:photo.y,bottom:photo.bottom},copy:{y:copy.y,bottom:copy.bottom},color:Number(document.querySelector('.portrait-frame-color').dataset.coverage),particles:Number(document.querySelector('.about-absorb-dust')?.dataset.particles||0),absorb:Number(document.querySelector('#about').dataset.absorbProgress),complete:document.querySelector('#about').dataset.absorbComplete,entry:Number(document.querySelector('#projects').dataset.entryProgress),opacity:getComputedStyle(document.querySelector('.about-reading-content--right .about-reading-copy')).opacity,overflow:document.documentElement.scrollWidth-innerWidth};
});
try{
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden',null,{timeout:120000});
 for(const [width,height] of [[390,844],[320,480],[430,932],[667,375]]){
  if(process.argv[2]==='resize') break;
  await page.setViewportSize({width,height});await page.waitForTimeout(500);await nav();
  const initial=await state();assert.equal(initial.text,text);assert.equal(initial.left,'none');assert.equal(initial.color,0);assert.ok(initial.copy.y>initial.photo.bottom);assert.equal(initial.overflow,0);
  await seek(0);const reading=await state();assert.ok(reading.copy.bottom<=height+2);assert.equal(reading.opacity,'1');
  await page.screenshot({path:`artifacts/mobile/about-single-${width}-reading.png`});
  await seek(.58);const absorbing=await state();assert.ok(absorbing.color>0&&absorbing.color<1,JSON.stringify(absorbing));assert.ok(absorbing.particles>0);assert.equal(absorbing.opacity,'0');
  await page.screenshot({path:`artifacts/mobile/about-single-${width}-absorb.png`});
  await seek(1.02);await page.waitForFunction(()=>document.querySelector('#about').dataset.absorbComplete==='true');const colored=await state();assert.equal(colored.color,1);
  await page.screenshot({path:`artifacts/mobile/about-single-${width}-color.png`});
  await page.mouse.wheel(0,height*1.5);await page.waitForTimeout(1200);const works=await state();assert.ok(works.entry>0);assert.equal(works.overflow,0);
  await nav();const reverse=await state();assert.equal(reverse.color,0);assert.equal(reverse.opacity,'1');assert.equal(reverse.entry,0);
  results.push({width,height,initial,reading,absorbing,colored,entry:works.entry,reverse});console.log('PASS single mobile copy/dust/color/reverse',width);
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(800);await nav();
 assert.equal(await page.locator('#about').evaluate(e=>e.classList.contains('has-mobile-copy')),false);
 assert.ok(await page.locator('.about-reading-content--left').textContent().then(s=>s.includes('I’M PASSIONATE ABOUT')));
 assert.ok(await page.locator('.about-reading-content--right').textContent().then(s=>s.includes('AND A GROWING INTEREST')));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);await nav();assert.equal((await state()).text,text);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(800);
 assert.equal((await state()).text,text);assert.equal((await state()).left,'none');
 assert.equal(await page.locator('.about-reading-content--right .about-reading-copy').evaluate(e=>getComputedStyle(e).opacity),'1');
 assert.equal(await page.locator('.portrait-frame').evaluate(e=>getComputedStyle(e).filter),'none');
 assert.ok(await page.locator('.about-reading-word').evaluateAll(es=>es.every(e=>Number(getComputedStyle(e).opacity)===1)));
 assert.deepEqual(errors,[]);console.log('PASS desktop/mobile resize and reduced motion');
}finally{await writeFile(process.argv[2]==='resize'?'artifacts/mobile/about-single-copy-resize-qa.json':'artifacts/mobile/about-single-copy-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
