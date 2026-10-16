import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const onlyWidth = Number(process.argv[2]);
const previewOnly = process.argv.includes('preview');
const results = [], errors = [];
let currentPage;
const cases = [[1440, 900, false], [820, 1000, false], [390, 844, false], [320, 640, false], [390, 844, true]];
try {
  for (const [width, height, reduced] of cases) {
    if (onlyWidth && onlyWidth !== width) continue;
    const record = width === 1440;
    const recordingStart = Date.now();
    const page = currentPage = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(record ? { recordVideo: { dir: 'artifacts/cloud-return-video', size: { width, height } } } : {}) });
    page.setDefaultTimeout(18000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes, ...rest) {
        if (type === 'webgl' && this.classList.contains('hero-aperture')) return getContext.call(this, type, { ...attributes, preserveDrawingBuffer: true }, ...rest);
        return getContext.call(this, type, attributes, ...rest);
      };
    });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'), undefined, { timeout: 60000 });
    await page.waitForTimeout(300);
    const label = `${width}${reduced ? '-reduced' : ''}`;
    let departureBaseline;
    const readDeparture = () => page.locator('.footer-editorial, .signature-bottom, .footer-back-to-top').evaluateAll(elements => elements.map(el => ['translate','scale','filter','willChange','transformOrigin'].map(key => el.style[key])));
    const inspect = () => page.evaluate(() => {
      const overlay = document.querySelector('.colonnade-overlay'), hero = document.querySelector('#hero');
      return { scroll: scrollY, hash: location.hash, hero: { ...hero.dataset }, overlay: { ...overlay.dataset }, overlayVisible: getComputedStyle(overlay).visibility, cloud: overlay.classList.contains('is-cloud-return'), busy: document.documentElement.classList.contains('is-colonnade-transitioning'), inert: document.querySelector('#main-content').inert, overflow: document.documentElement.style.overflow, footerTranslate: document.querySelector('.footer-stage').style.translate, focused: document.activeElement.id, journey: document.querySelector('.studio-header').dataset.footerJourney, overflowX: document.documentElement.scrollWidth - innerWidth };
    });
    const footer = async () => {
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(650);
      departureBaseline = await readDeparture();
    };
    const clickReturn = async () => {
      departureBaseline = await readDeparture();
      // Preserve the visible footer; locator.click centers this top-edge link.
      const box = await page.locator('.footer-back-to-top').boundingBox();
      assert.equal(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.footer-back-to-top')), { x: box.x + box.width / 2, y: box.y + box.height / 2 }), true, 'visible return control receives pointer input');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    };
    const endpoint = async () => {
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-colonnade-transitioning') && scrollY < 1);
      await page.waitForTimeout(100);
      const state = await inspect();
      assert.equal(state.hash, '#hero'); assert.equal(state.inert, false); assert.equal(state.overflow, '');
      assert.equal(state.hero.entryPhase, 'white'); assert.equal(state.hero.returnAssembly, '1.0000');
      assert.equal(state.hero.paintingScale, '1.0000'); assert.equal(state.hero.entryProgress, '0.0000');
      assert.equal(state.overlay.phase, 'idle'); assert.equal(state.overlayVisible, 'hidden');
      assert.equal(state.footerTranslate, ''); assert.equal(state.focused, 'hero-heading');
      assert.deepEqual(await page.locator('.footer-stage').evaluate(el => ['translate','scale','filter','willChange'].map(key => el.style[key])), ['', '', '', '']);
      assert.deepEqual(await readDeparture(), departureBaseline, 'each foreground element restores its exact inline properties');
      assert.equal(state.journey, 'inactive'); assert.ok(state.overflowX <= 1);
      return state;
    };
    await page.screenshot({ path: `artifacts/cloud-return-${label}-initial.png` });
    await footer();
    await page.evaluate(() => {
      window.cloudReturnSamples = [];
      window.cloudMaskSamples = [];
      let started = false;
      const readMask = (assembly, target) => {
        const canvas = document.querySelector('.hero-aperture'), gl = canvas.getContext('webgl');
        if (!gl) return;
        const pixels = new Uint8Array(canvas.width * canvas.height * 4); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let minAlpha = 255, openPixels = 0, partialPixels = 0, left = canvas.width, right = -1, top = canvas.height, bottom = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3]; minAlpha = Math.min(minAlpha, alpha);
          if (alpha < 8) openPixels++;
          else if (alpha < 248) partialPixels++;
          if (alpha < 128) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
        window.cloudMaskSamples.push({ target, assembly, minAlpha, openPixels, partialPixels, box: right < left ? null : { left, top, width: right - left + 1, height: bottom - top + 1 }, canvas: { width: canvas.width, height: canvas.height } });
      };
      window.cloudReturnSampling = true;
      const sample = () => {
        if (!window.cloudReturnSampling) return;
        const overlay = document.querySelector('.colonnade-overlay');
        const assembly = Number(document.querySelector('#hero').dataset.returnAssembly);
        if (overlay.classList.contains('is-active')) { started = true; window.cloudReturnSamples.push({ time: performance.now(), scroll: scrollY, ...overlay.dataset, assembly, departure: ['translate','scale','filter','willChange'].map(key => document.querySelector('.footer-stage').style[key]) }); }
        if (started && scrollY < 1) {
          for (const target of [0, .25, .5, 1]) if (!window.cloudMaskSamples.some(s => s.target === target) && (target === 0 ? assembly === 0 : assembly >= target)) readMask(assembly, target);
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.screenshot({ path: `artifacts/cloud-return-${label}-footer.png` });
    const videoStart = (Date.now() - recordingStart) / 1000;
    const before = await inspect();
    await clickReturn();
    if (!reduced) {
      await page.waitForFunction(() => { const e = document.querySelector('.colonnade-overlay'); return e.dataset.phase === 'cover' && Number(e.dataset.cloudProgress) > .2; });
      assert.equal((await inspect()).cloud, true);
      await page.keyboard.press('PageDown');
      await page.evaluate(() => document.querySelector('.footer-back-to-top').click());
      await page.screenshot({ path: `artifacts/cloud-return-${label}-ascent.png` });
      await page.waitForFunction(() => { const e = document.querySelector('.colonnade-overlay'); return e.dataset.phase === 'reveal' && Number(e.dataset.cloudProgress) > .25; });
      await page.screenshot({ path: `artifacts/cloud-return-${label}-emerging.png` });
      await page.waitForFunction(() => Number(document.querySelector('#hero').dataset.returnAssembly) >= .45);
      await page.screenshot({ path: `artifacts/cloud-return-${label}-assembling.png` });
    }
    const final = await endpoint();
    await page.screenshot({ path: `artifacts/cloud-return-${label}-settled.png` });
    const videoDuration = (Date.now() - recordingStart) / 1000 - videoStart;
    const samples = await page.evaluate(() => { window.cloudReturnSampling = false; return window.cloudReturnSamples; });
    if (!reduced) {
      assert.ok(samples.some(sample => sample.cloudOpaque === 'true'), 'destination swap has opaque cloud cover');
      assert.ok(samples.some(sample => Number(sample.assembly) > .05 && Number(sample.assembly) < .95), 'intact hero grows geometrically from zero');
      assert.ok(samples.some(sample => sample.cloudPhase === 'cover' && sample.cloudOpaque === 'false' && Number(sample.cloudProgress) > .1));
      assert.ok(samples.filter(sample => sample.phase === 'cover' && sample.cloudOpaque === 'false').every(sample => Math.abs(sample.scroll - before.scroll) < 1), 'source stays fixed throughout uncovered ascent');
      const intermediate = samples.filter(sample => sample.scroll > 1 && sample.scroll < before.scroll - 1);
      assert.deepEqual(intermediate, [], 'no long page scroll is exposed between source and destination');
    }
    const maskSamples = await page.evaluate(() => window.cloudMaskSamples);
    if (!reduced) {
      assert.equal(maskSamples.length, 4, JSON.stringify(maskSamples));
      const zero = maskSamples.find(s => s.target === 0), full = maskSamples.find(s => s.target === 1);
      assert.equal(zero.minAlpha, 255); assert.equal(zero.openPixels, 0); assert.equal(zero.box, null);
      for (const mask of maskSamples.filter(s => s.target > 0)) {
        assert.equal(mask.minAlpha, 0, 'mask interior reveals full painting color, without alpha fade');
        assert.ok(mask.openPixels > 0);
        assert.ok(Math.abs(mask.box.width / full.box.width - mask.assembly) < .065, JSON.stringify(mask));
        assert.ok(Math.abs(mask.box.height / full.box.height - mask.assembly) < .065, JSON.stringify(mask));
      }
    }
    // The same aperture still opens with normal forward/reverse scrolling.
    await page.evaluate(y => scrollTo(0, y), height * .9);
    await page.waitForTimeout(300);
    assert.ok(Number((await inspect()).hero.entryProgress) > .2);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
    assert.equal((await inspect()).hero.entryPhase, 'white');
    if (width === 1440 && !previewOnly) {
      // Replay with a resize while the source is covered, using keyboard entry.
      await footer(); await page.locator('.footer-back-to-top').evaluate(element => element.focus({ preventScroll: true })); await page.keyboard.press('Enter');
      await page.waitForTimeout(500); await page.setViewportSize({ width: 1366, height: 850 });
      await endpoint();
      // Changing the motion preference while covering must release all locks.
      await footer(); await clickReturn();
      await page.waitForTimeout(450); await page.emulateMedia({ reducedMotion: 'reduce' });
      await endpoint(); await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    if (reduced) {
      // Initial reduced motion has no Lenis: native wheel/keys stay locked too.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await footer(); await clickReturn();
      await page.waitForFunction(() => document.querySelector('.colonnade-overlay').dataset.phase === 'reveal');
      await page.mouse.move(width / 2, height / 2); await page.mouse.wheel(0, 650); await page.keyboard.press('PageDown');
      await page.waitForTimeout(150); assert.equal(Math.round((await inspect()).scroll), 0);
      await endpoint();
    }
    results.push({ width, height, reduced, final, samples, maskSamples });
    console.log('PASS accelerating ascent, full-white swap, geometric growth with full-color interior, cleanup and forward/reverse', label);
    const video = page.video(); await page.close(); currentPage = null;
    if (video) { await video.saveAs('artifacts/cloud-return-preview-raw.webm'); await writeFile('artifacts/cloud-return-preview.json', JSON.stringify({ start: videoStart, duration: videoDuration }, null, 2)); }
  }
  assert.deepEqual(errors, []);
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await writeFile('artifacts/cloud-return-failure-state.json', JSON.stringify(await currentPage.evaluate(() => ({ scroll: scrollY, hero: document.querySelector('#hero')?.dataset, overlay: document.querySelector('.colonnade-overlay')?.dataset, samples: window.cloudReturnSamples, maskSamples: window.cloudMaskSamples })).catch(() => ({})), null, 2));
    await currentPage.screenshot({ path: 'artifacts/cloud-return-failure.png' }).catch(() => {});
  }
  throw error;
} finally {
  await writeFile(`artifacts/cloud-return-qa${onlyWidth ? `-${onlyWidth}` : ''}.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
