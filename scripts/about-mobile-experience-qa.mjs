import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [], errors = [];
const page = await browser.newPage();
page.on('pageerror', error => errors.push(error.message));
async function state() {
  return page.evaluate(() => {
    const about = document.querySelector('#about');
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top:r.top, bottom:r.bottom, x:r.left+r.width/2, y:r.top+r.height/2 }; };
    return { width:innerWidth, height:innerHeight, first:rect('.about-reading-content--left'), last:rect('.about-reading-content--right'), photo:rect('.portrait-orbit'), nav:rect('.studio-bar'), phase:about.dataset.cinematicPhase, absorb:Number(about.dataset.absorbProgress), complete:about.dataset.absorbComplete, color:Number(document.querySelector('.portrait-frame-color').dataset.coverage), frame:getComputedStyle(document.querySelector('.portrait-frame')).filter, words:[...about.querySelectorAll('.about-reading-word')].map(el=>Number(getComputedStyle(el).opacity)), copies:[...about.querySelectorAll('.about-reading-copy')].map(el=>getComputedStyle(el).opacity), align:[...about.querySelectorAll('.about-reading-copy')].map(el=>getComputedStyle(el).textAlign), particles:Number(document.querySelector('.about-absorb-dust').dataset.particles), entry:Number(document.querySelector('#projects').dataset.entryProgress), background:getComputedStyle(document.querySelector('.studio-bar')).backgroundColor, overflow:document.documentElement.scrollWidth-innerWidth };
  });
}
async function seek(phase, value) {
  await page.evaluate(({phase,value}) => {
    const el=document.querySelector('#about');
    const total=parseFloat(el.style.getPropertyValue('--about-scroll-distance'));
    const text=[...el.querySelectorAll('.about-reading-copy')].reduce((sum,p)=>sum+Math.round(p.querySelectorAll('.about-reading-word').length*5.5),0);
    const progress=phase==='reading' ? text*value/total : (text+160*value)/total;
    scrollTo({top:scrollY+el.getBoundingClientRect().top+(el.offsetHeight-innerHeight)*progress,behavior:'instant'});
  },{phase,value});
  await page.waitForTimeout(phase==='reading'?700:3900);
}
try {
  for (const [width,height] of [[330,715],[390,844],[320,640],[820,1000],[1440,900]]) {
    if(process.argv[2] && width!==Number(process.argv[2])) continue;
    await page.setViewportSize({width,height});
    await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
    await page.locator('.studio-link[href="#about"]').click();
    await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(500);
    const initial=await state();
    assert.equal(initial.overflow,0); assert.equal(initial.background,'rgba(0, 0, 0, 0)');
    assert.equal(initial.color,0); assert.ok(initial.words.every(value=>value<.01));
    if(width<700){
      assert.deepEqual(initial.align,['center','center']);
      for(const box of [initial.first,initial.last,initial.photo]) assert.ok(Math.abs(box.x-width/2)<1);
      assert.ok(initial.first.top>initial.nav.bottom+12); assert.ok(initial.last.bottom<=height);
      assert.ok(Math.abs((initial.first.top+initial.last.bottom)/2-(height+60)/2)<2);
    }
    await page.screenshot({path:`artifacts/about-experience-${width}-initial.png`});
    await seek('reading',1);
    const reading=await state(); assert.ok(reading.words.every(value=>value>.99)); assert.equal(reading.entry,0);
    await page.screenshot({path:`artifacts/about-experience-${width}-reading.png`});
    await seek('absorb',.58);
    const midway=await state(); assert.ok(midway.absorb>.5&&midway.absorb<.65); assert.ok(midway.color>0&&midway.color<1); assert.ok(midway.particles>0); assert.deepEqual(midway.copies,['0','0']); assert.equal(midway.entry,0);
    await page.screenshot({path:`artifacts/about-experience-${width}-absorb.png`});
    await seek('absorb',1.03);
    const complete=await state(); assert.equal(complete.complete,'true'); assert.ok(complete.color>.99);
    await page.screenshot({path:`artifacts/about-experience-${width}-color.png`});
    await page.mouse.wheel(0,height*1.6); await page.waitForTimeout(1500);
    const works=await state(); assert.ok(works.entry>0); assert.equal(works.complete,'true');
    await page.screenshot({path:`artifacts/about-experience-${width}-works.png`});
    await page.evaluate(()=>{const el=document.querySelector('#projects');scrollTo({top:scrollY+el.getBoundingClientRect().top,behavior:'instant'});});
    await page.waitForTimeout(800);
    assert.equal((await state()).entry,1);
    await seek('reading',0);
    const reverse=await state(); assert.equal(reverse.color,0); assert.equal(reverse.entry,0); assert.deepEqual(reverse.copies,['1','1']);
    results.push({width,height,initial,midway,complete,workEntry:works.entry,reverseColor:reverse.color});
    console.log('PASS experience',width);
  }
  await page.locator('.studio-link[href="#projects"]').click();
  await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.waitForTimeout(800);
  assert.equal((await state()).entry,1,'Work navbar lands on visible cards');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:330,height:715});
  await page.locator('.studio-link[href="#about"]').click();
  await page.waitForFunction(()=>!document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.waitForTimeout(800);
  const reduced=await page.evaluate(()=>({
    copies:[...document.querySelectorAll('.about-reading-copy')].map(el=>({opacity:getComputedStyle(el).opacity,text:el.textContent.trim(),filter:getComputedStyle(el).filter})),
    frame:getComputedStyle(document.querySelector('.portrait-frame')).filter,
    canvas:!!document.querySelector('.about-absorb-dust'),
    overflow:document.documentElement.scrollWidth-innerWidth,
  }));
  assert.ok(reduced.copies.every(copy=>copy.opacity==='1'&&copy.text.length>100&&copy.filter==='none'));
  assert.equal(reduced.frame,'none'); assert.equal(reduced.canvas,false); assert.equal(reduced.overflow,0);
  results.push({reduced}); assert.deepEqual(errors,[]);
} finally {
  await writeFile('artifacts/about-mobile-experience-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
