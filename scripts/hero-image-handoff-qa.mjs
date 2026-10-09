import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const before = process.argv.includes('--before');
const errors = [], results = [];
try {
  for (const [width, height, reduced, fallback] of before ? [[1742, 926, false, false]] : [[1742, 926, false, false], [820, 1000, false, false], [390, 844, false, false], [320, 700, false, false], [390, 844, true, false], [390, 844, false, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    if (fallback) await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /^webgl/.test(type) ? null : getContext.call(this, type, ...args); };
    });
    await page.goto('http://127.0.0.1:5174/');
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    await page.waitForTimeout(1100);
    for (const progress of [0,.45,.69,.7,.74,.78,.82,.86,.9,.78,.7,.45,0]) {
      await page.evaluate(y => scrollTo(0, y), height * (reduced ? .7 : 1.8) * progress);
      await page.waitForTimeout(400);
      const state = await page.locator('#hero').evaluate(hero => ({ ...hero.dataset, overflow: document.documentElement.scrollWidth - innerWidth, locked: document.body.style.overflow === 'hidden', top: hero.getBoundingClientRect().top, paintingOpacity: getComputedStyle(hero.querySelector('.hero-destination')).opacity }));
      assert.equal(state.overflow, 0);
      assert.equal(state.locked, false);
      assert.equal(state.paintingOpacity, '1');
      assert.ok(Math.abs(state.top) < 2);
      const layers=await page.locator('#hero').evaluate(hero=>{
        const a=hero.querySelector('.hero-entry-image'),b=hero.querySelector('.hero-destination-image');
        const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
        const scaleA=ar.width/1448,scaleB=br.width/1421;
        const anchorA={x:ar.left+(276+715*.629)*scaleA,y:ar.top+(238+330*.629)*scaleA};
        const anchorB={x:br.left+715*scaleB,y:br.top+330*scaleB};
        return {a:decodeURIComponent(a.currentSrc),b:decodeURIComponent(b.currentSrc),loaded:[a,b].every(i=>i.complete&&i.naturalWidth>0),blend:+getComputedStyle(b).opacity,coverA:ar.left<=.1&&ar.top<=.1&&ar.right>=innerWidth-.1&&ar.bottom>=innerHeight-.1,coverB:br.left<=.1&&br.top<=.1&&br.right>=innerWidth-.1&&br.bottom>=innerHeight-.1,alignment:Math.hypot(anchorA.x-anchorB.x,anchorA.y-anchorB.y),anchorB,navbar:getComputedStyle(document.querySelector('.studio-header')).visibility};
      });
      assert.ok(layers.a.endsWith('/Sidang Kekaisaran Romawi di Aula Marmer.png'));
      assert.ok(layers.b.endsWith('/paling-atas.png'));assert.ok(layers.loaded);
      assert.ok(layers.coverA);assert.ok(layers.alignment<.1);
      if(progress<=.7)assert.ok(layers.blend<.001);
      if(progress>=.7)assert.ok(layers.coverB);
      if(progress>=.86)assert.ok(layers.blend>.999);
      if(progress>=.9)assert.equal(layers.navbar,'visible');
      results.push({width,progress,layers});
      results.push({ width, reduced, fallback, progress, state });
      if ([0,.45,.7,.78,.86,.9].includes(progress)) await page.screenshot({ path: `artifacts/handoff-${before ? 'before' : 'after'}-${width}-${reduced}-${fallback}-${progress}.png` });
    }
    if (!before && width === 1742) {
      await page.mouse.move(400, 250); await page.mouse.move(520, 340);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.hero-aperture').getAttribute('data-trail-state'), 'active');
      await page.waitForTimeout(3500);
      assert.equal(await page.locator('.hero-aperture').getAttribute('data-trail-state'), 'idle');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.mouse.wheel(0, 850); await page.waitForTimeout(1200);
      assert.ok(Number(await page.locator('#hero').getAttribute('data-entry-progress')) > .1);
      await page.mouse.wheel(0, -850); await page.waitForTimeout(1200);
    }
    await page.evaluate(y => scrollTo(0, y), height * 3.4);
    await page.waitForTimeout(400);
    assert.ok(await page.locator('#hero').evaluate(hero => hero.getBoundingClientRect().bottom < innerHeight));
    console.log('PASS', width, { reduced, fallback });
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`artifacts/handoff-${before ? 'before' : 'after'}-qa.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
