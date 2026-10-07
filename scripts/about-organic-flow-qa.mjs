import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
const page = await browser.newPage({ viewport:{width:1440,height:900} });
const results=[],errors=[];
page.on('pageerror', e=>errors.push(e.message));
async function nav(id) {
  await page.locator(`.studio-link[href="#${id}"]`).click();
  await page.waitForFunction(id=>location.hash===`#${id}`&&!document.documentElement.classList.contains('is-colonnade-transitioning'),id);
}
async function seek(amount) {
  await page.evaluate(amount=>{
    const el=document.querySelector('#about');
    const text=[...el.querySelectorAll('.about-reading-copy')].reduce((sum,p)=>sum+Math.round(p.querySelectorAll('.about-reading-word').length*5.5),0);
    const total=parseFloat(el.style.getPropertyValue('--about-scroll-distance'));
    scrollTo({top:scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*(text+160*amount)/total,behavior:'instant'});
  },amount);
}
try {
  await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
  await nav('about'); await seek(1.8); await page.waitForTimeout(4200);
  await page.mouse.wheel(0,650); await page.waitForTimeout(2100);
  const chapter=await page.evaluate(()=>({phase:document.querySelector('#about').dataset.cinematicPhase,complete:document.querySelector('#about').dataset.absorbComplete,visible:document.querySelector('.about-chapter').dataset.workVisible,title:document.querySelector('.about-chapter-title').textContent,current:document.querySelector('.studio-link[aria-current]')?.hash}));
  results.push({test:'real chapter handoff',...chapter});
  assert.equal(chapter.complete,'true'); assert.equal(chapter.visible,'true'); assert.equal(chapter.title,'Work.'); assert.equal(chapter.current,'#projects');
  await page.screenshot({path:'artifacts/about-organic-work-handoff.png'});
  await nav('projects');
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lenis-stopped')),false);
  await nav('about'); await seek(.5); await page.waitForTimeout(1900);
  await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(1000);
  const reduced=await page.evaluate(()=>{
    const canvas=document.querySelector('.about-absorb-dust');
    const hasInk=canvas?[...canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data].some((v,i)=>i%4===3&&v>0):false;
    return {hasInk,opacity:[...document.querySelectorAll('.about-reading-copy')].map(el=>getComputedStyle(el).opacity),transform:getComputedStyle(document.querySelector('.portrait-core')).transform,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  results.push({test:'desktop reduced motion during absorption',...reduced});
  assert.equal(reduced.hasInk,false); assert.deepEqual(reduced.opacity,['1','1']); assert.equal(reduced.transform,'none'); assert.equal(reduced.overflow,0);
  assert.deepEqual(errors,[]);
} finally {
  console.log(JSON.stringify({results,errors},null,2));
  await writeFile('artifacts/about-organic-flow-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
