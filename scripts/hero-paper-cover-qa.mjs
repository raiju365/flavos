import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];
try {
  for (const [width, height, reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    await page.waitForTimeout(1200);
    const entry = height * (reduced ? .7 : 1.8);
    const samples = [];
    for (const cover of [0,.25,.5,.75,1,.75,.5,.25,0]) {
      await page.evaluate(y => window.scrollTo(0,y), entry + height * cover);
      await page.waitForTimeout(350);
      const sample = await page.evaluate(() => {
        const hero = document.querySelector('#hero'), paper = document.querySelector('.folio-logo-pause');
        return { heroTop: hero.getBoundingClientRect().top, paperTop: paper.getBoundingClientRect().top,
          progress: +hero.dataset.entryProgress, transform: hero.querySelector('.hero-destination').style.transform,
          front: !!document.elementFromPoint(innerWidth/2,innerHeight-2)?.closest('.folio-logo-pause'),
          overflow: document.documentElement.scrollWidth-innerWidth, locked: document.body.style.overflow === 'hidden' };
      });
      assert.ok(Math.abs(sample.heroTop)<2, JSON.stringify(sample));
      assert.ok(Math.abs(sample.paperTop-height*(1-cover))<3, JSON.stringify(sample));
      assert.ok(sample.progress >= .999); assert.equal(sample.overflow,0); assert.equal(sample.locked,false);
      if (cover>0) assert.equal(sample.front,true);
      samples.push({cover,...sample});
      if (cover===.5 && samples.length===3) await page.screenshot({path:`artifacts/hero-paper-cover-${width}-${reduced}.png`});
    }
    assert.equal(new Set(samples.map(s=>s.transform)).size,1);
    await page.mouse.wheel(0,height*.5); await page.waitForTimeout(1500);
    assert.ok(await page.locator('.folio-logo-pause').evaluate(e=>e.getBoundingClientRect().top<innerHeight*.8));
    await page.mouse.wheel(0,-height*.5); await page.waitForTimeout(1500);
    await page.evaluate(y=>scrollTo(0,y),entry+height*1.2); await page.waitForTimeout(350);
    assert.ok(await page.locator('#hero').evaluate(e=>e.getBoundingClientRect().top<0));
    results.push({width,height,reduced,samples}); console.log('PASS',width,reduced);
    await page.close();
  }
  assert.deepEqual(errors,[]);
} finally {
  await writeFile('artifacts/hero-paper-cover-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}


