import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const sharp = require('sharp');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || /inspection unavailable/.test(message.text())) errors.push(message.text()); });
  await page.route('**/src/footer-sticker-viewer.js*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('prepared = true;', `prepared = true;
      window.stickerConformControls = { closeAndPause() { close(); animation?.pause(); }, setProgress(value) { animation?.pause(); transition.progress=value; paint(); }, finish() { finishClose(); } };
    `);
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, options, ...rest) { return get.call(this, type, /webgl/.test(type) ? { ...options, preserveDrawingBuffer: true } : options, ...rest); };
    window.__THREE_DEVTOOLS__ = { dispatchEvent(event) {
      const renderer = event.detail; if (!renderer?.isWebGLRenderer) return;
      const render = renderer.render.bind(renderer);
      renderer.render = function(scene, camera) {
        if (renderer.domElement.classList.contains('sticker-viewer-canvas')) window.stickerConformScene = { renderer, scene, camera };
        if (renderer.domElement.classList.contains('footer-signature-canvas') && scene.children.some(object => object.isGroup)) window.stickerLogoModel = scene.children.find(object => object.isGroup);
        return render(scene, camera);
      };
    } };
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen') && window.stickerConformControls);
  await page.addStyleTag({ content: '.tv-noise {opacity:0!important} #custom-cursor,.footer-sticker-trigger::after {visibility:hidden!important} .footer-sticker-trigger {outline:none!important}' });
  await page.locator('#contact').scrollIntoViewIfNeeded(); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  for (const index of [4, 0, 1, 3, 5, 2]) {
    const button = page.locator(`.footer-sticker-trigger[data-sticker="${index}"]`), rect = await button.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.waitForTimeout(60); await button.click();
    await page.waitForFunction(() => document.querySelector('.sticker-viewer').dataset.phase === 'open');
    await page.evaluate(() => { window.sameStickerObject = stickerConformScene.scene.children.find(object => object.isGroup).children[0]; });
    await page.screenshot({ path: `artifacts/sticker-conform-${index}-front.png` });
    const stats = await page.evaluate(() => {
      const { scene, renderer } = stickerConformScene;
      const group = scene.children.find(object => object.isGroup), geometry = group.children[0].geometry;
      const bound = geometry.userData.attachment;
      const z = [];
      for (let i = 0; i < bound.total; i++) if (geometry.attributes.stickerAttachedCoverage.getX(i) > .5) z.push(bound.positions[i * 3 + 2]);
      const gl = renderer.getContext();
      return { matched: bound.matched, walls: bound.walls, total: bound.total, projectedError: bound.projectedError,
        minZ: z.reduce((min, value) => Math.min(min, value), Infinity), maxZ: z.reduce((max, value) => Math.max(max, value), -Infinity), glError: gl.getError(), contours: geometry.userData.contours.map(contour => contour.length) };
    });
    console.log('Binding stats', index, JSON.stringify(stats));
    assert.ok(stats.matched > 0); assert.ok(stats.projectedError < .01); assert.equal(stats.glError, 0);
    if ([0, 4, 5].includes(index)) { assert.ok(stats.walls > 0); assert.ok(stats.maxZ - stats.minZ > .04); }
    await page.evaluate(() => stickerConformControls.closeAndPause());
    const frames = [];
    for (const progress of [1, .65, .4, .34, .25, .16, .07, .025, 0]) {
      await page.evaluate(progress => stickerConformControls.setProgress(progress), progress);
      const state = await page.locator('.sticker-viewer').evaluate(element => ({ ...element.dataset }));
      frames.push(state);
      if ([4, 0, 1].includes(index)) await page.screenshot({ path: `artifacts/sticker-conform-${index}-return-${progress}.png` });
    }
    assert.equal(frames.at(-1).contact, '1.0000'); assert.equal(frames.at(-1).flight, '0.0000');
    await page.evaluate(() => stickerConformControls.finish());
    assert.equal(await page.evaluate(() => sameStickerObject.parent === stickerLogoModel && sameStickerObject.userData.attachmentMode === 'logo'), true, 'the inspected object itself remains physically attached to the logo');
    assert.equal(await page.locator('.sticker-viewer').evaluate(element => element.open), false);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.screenshot({ path: `artifacts/sticker-conform-${index}-attached.png` });
    results.push({ index, stats, frames });
    console.log('PASS smoothed contour and actual cap/bevel/wall binding', index, JSON.stringify(stats));
  }
  assert.deepEqual(errors, []);
  // A contact sheet of the visible seating phase, cropped around the logo.
  const columns = [];
  for (const [i, value] of [.34, .16, .025, 0].entries()) {
    const input = await sharp(`artifacts/sticker-conform-4-return-${value}.png`).extract({ left: 840, top: 270, width: 360, height: 340 }).resize(540, 510).png().toBuffer();
    columns.push({ input, left: i * 540, top: 0 });
  }
  await sharp({ create: { width: 2160, height: 510, channels: 3, background: '#202334' } }).composite(columns).png().toFile('artifacts/sticker-conform-seating-sequence.png');
} finally {
  await writeFile('artifacts/sticker-conform-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
