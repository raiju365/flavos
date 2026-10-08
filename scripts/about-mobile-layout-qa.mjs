import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  for (const [width, height] of [[330,715],[390,844],[320,640],[430,932],[820,1000],[1440,900]]) {
    if (process.argv[2] && width !== Number(process.argv[2])) continue;
    await page.setViewportSize({width,height});
    await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.isMainPageReady && document.body.style.overflow !== 'hidden');
    await page.locator('.studio-link[href="#about"]').click();
    await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(400);
    const geometry = await page.evaluate(()=>{
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}; };
      return {nav:rect('.studio-bar'),first:rect('.about-reading-content--left'),photo:rect('.portrait-orbit'),last:rect('.about-reading-content--right'),stage:rect('.about-reading-stage'),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(geometry.overflow,0);
    assert.equal(await page.locator('.studio-bar').evaluate(el=>getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    if(width<700){
      assert.ok(geometry.first.top > geometry.nav.bottom + 12,JSON.stringify(geometry));
      assert.ok(geometry.photo.top > geometry.first.bottom + 15);
      assert.ok(geometry.last.top > geometry.photo.bottom + 15);
      await page.screenshot({path:`artifacts/about-mobile-fixed-${width}.png`});
      await page.mouse.move(width/2,height*.7);
      await page.mouse.wheel(0,Math.max(200,geometry.stage.height-height+80));
      await page.waitForTimeout(1200);
      assert.ok(await page.locator('.about-reading-content--right').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight), 'last paragraph reachable');
      assert.ok(await page.evaluate(()=>document.querySelector('.about-reading-content--left').getBoundingClientRect().top > document.querySelector('.studio-bar').getBoundingClientRect().bottom + 12), 'pinned first paragraph stays below navbar');
      console.log('reading state', await page.locator('.about-reading-content--right').evaluate(el=>({opacity:getComputedStyle(el).opacity,copy:getComputedStyle(el.firstElementChild).opacity,word:getComputedStyle(el.querySelector('span')).opacity,progress:document.querySelector('#projects').dataset.entryProgress,y:scrollY})));
      await page.screenshot({path:`artifacts/about-mobile-reading-end-${width}.png`});
      await page.mouse.wheel(0,-2000);
      await page.waitForTimeout(1200);
    }
    console.log('PASS',width,JSON.stringify(geometry));
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
