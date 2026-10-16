import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];
const url = 'http://127.0.0.1:4175/';
try {
  for (const [width, height, reduced] of [[1440,900,false], [820,1000,false], [390,844,false], [320,640,false], [390,844,true]]) {
    const page = await browser.newPage({
      viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference',
      ...(width === 1440 ? { recordVideo: { dir: 'artifacts/loader-lift-video', size: { width, height } } } : {}),
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.loaderFrames = [];
      window.revealedAt = 0;
      window.addEventListener('portfolio:reveal', () => { window.revealedAt = performance.now(); });
      const sample = () => {
        const loader = document.querySelector('#loading-screen');
        const grain = document.querySelector('.tv-noise');
        if (loader && grain || window.revealedAt && performance.now() - window.revealedAt < 600) {
          const s = grain && getComputedStyle(grain), l = loader && getComputedStyle(loader);
          window.loaderFrames.push({ t: performance.now(), loader: !!loader, phase: loader?.dataset.phase,
            mode: loader?.dataset.reveal, p: Number(loader?.dataset.revealProgress || 0),
            top: loader?.getBoundingClientRect().top, opacity: l?.opacity, clip: l?.clipPath, color: l?.backgroundColor,
            y: scrollY, grain: Number(s?.opacity || 0), visible: s?.visibility, renderer: grain?.dataset.noiseRenderer,
            ready: document.querySelector('.footer-signature')?.dataset.signatureReady });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const settled = () => page.waitForFunction(() => !document.querySelector('#loading-screen') && Number(getComputedStyle(document.querySelector('.tv-noise')).opacity) === .1);
    const check = async (visit, expectedY) => {
      await page.waitForFunction(() => document.querySelector('#loading-screen')?.dataset.phase === 'opening');
      if (!reduced) {
        await page.waitForFunction(() => Number(document.querySelector('#loading-screen')?.dataset.revealProgress) > .15);
        const before = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(60);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 2, 'wheel stays locked until loader exits');
        if (visit !== 'fresh') await page.screenshot({ path: `artifacts/loader-lift-${width}-${visit}-middle.png` });
      }
      await settled();
      await page.waitForTimeout(100);
      const frames = await page.evaluate(() => window.loaderFrames);
      const loading = frames.filter(f => f.loader), opening = frames.filter(f => f.phase === 'opening');
      assert.ok(loading.length > 3 && opening.length > 2);
      assert.ok(loading.every(f => f.grain === 0 && f.visible === 'hidden'), 'grain stays fully hidden through loading and its exit');
      assert.ok(loading.every(f => !f.renderer), 'grain renderer does not draw while loader exists');
      assert.ok(opening.every(f => f.ready === 'true'), '3D and stickers are ready before the first reveal frame');
      assert.ok(opening.every(f => f.clip === 'none'), 'no curved clip path');
      assert.equal(new Set(opening.map(f => f.color)).size, 1, 'loader keeps a steady color without a white wash');
      assert.ok(Math.max(...opening.map(f => f.y)) - Math.min(...opening.map(f => f.y)) < 2, 'destination stays still');
      if (!reduced) {
        assert.ok(opening.every(f => f.mode === 'lift' && f.opacity === '1'));
        assert.ok(opening.some(f => f.p > .2 && f.p < .8));
        for (let i = 1; i < opening.length; i++) assert.ok(opening[i].top <= opening[i-1].top + 1, 'panel only moves upward');
        assert.ok(frames.some(f => !f.loader && f.grain > 0 && f.grain < .1), 'grain fades in after loader removal');
      } else assert.ok(opening.every(f => f.mode === 'reduced' && Math.abs(f.top) < 1));
      const state = await page.evaluate(() => ({ y: scrollY, shield: !!document.querySelector('.loader-reveal-shield'),
        grainCount: document.querySelectorAll('.tv-noise').length, grain: getComputedStyle(document.querySelector('.tv-noise')).opacity,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
      assert.equal(state.shield, false); assert.equal(state.grainCount, 1); assert.equal(state.overflow, false);
      if (expectedY !== undefined) assert.ok(Math.abs(state.y - expectedY) < 3, 'restored position remains correct');
      await page.screenshot({ path: `artifacts/loader-lift-${width}-${reduced?'reduced-':''}${visit}-settled.png` });
      results.push({ width, height, reduced, visit, state, frames });
      console.log('PASS', width, reduced ? 'reduced' : 'normal', visit, loading.length, 'covered frames');
    };
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await check('fresh', 0);
    await page.reload({ waitUntil: 'commit' });
    await check('refresh-home', 0);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    const saved = await page.evaluate(() => scrollY);
    await page.reload({ waitUntil: 'commit' });
    await check('refresh-footer', saved);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, -500);
    await page.waitForFunction(previous => scrollY < previous - 100, before);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#loading-screen').count(), 0);
    assert.equal(await page.locator('.tv-noise.is-active').count(), 1);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile('artifacts/loader-lift-grain-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
