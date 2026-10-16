import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
const onlyWidth = Number(process.argv[2]);
const study = process.argv.includes('study');
try {
  for (const [width, height, reduced] of [[1440, 900, false], [820, 1000, false], [390, 844, false], [320, 640, true]]) {
    if (onlyWidth && onlyWidth !== width) continue;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /inspection unavailable/i.test(message.text())) errors.push(message.text());
    });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, options, ...rest) {
        return getContext.call(this, type, /webgl/.test(type) ? { ...options, preserveDrawingBuffer: true } : options, ...rest);
      };
      window.__THREE_DEVTOOLS__ = { dispatchEvent(event) {
        const renderer = event.detail;
        if (!renderer?.isWebGLRenderer) return;
        const render = renderer.render.bind(renderer);
        renderer.render = function(scene, camera) {
          if (renderer.domElement.classList.contains('sticker-viewer-canvas')) window.stickerQA = { renderer, scene, camera };
          return render(scene, camera);
        };
      } };
    });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'), undefined, { timeout: 45000 });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.footer-sticker-trigger').count(), 6);
    assert.equal(await page.locator('.footer-signature').getAttribute('data-physical-stickers'), '6');
    await page.screenshot({ path: `artifacts/sticker-viewer-${width}-footer.png` });
    const inspect = () => page.evaluate(() => {
      const dialog = document.querySelector('.sticker-viewer');
      const group = window.stickerQA?.scene.children.find(object => object.isGroup);
      const mesh = group?.children[0];
      return {
        ...dialog.dataset, open: dialog.open, focused: document.activeElement?.className,
        overflow: document.body.style.overflow,
        blur: getComputedStyle(dialog.querySelector('.sticker-viewer-blur')).backdropFilter,
        meshes: group?.children.length, vertices: mesh?.geometry.attributes.position.count,
        depth: mesh ? (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox.max.z - mesh.geometry.boundingBox.min.z) : 0,
        quaternion: group?.quaternion.toArray(), sourceRotation: document.querySelector('.footer-signature').dataset.rotation,
        mainOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    const clickSticker = async index => {
      const button = page.locator(`.footer-sticker-trigger[data-sticker="${index}"]`);
      const rect = await button.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForTimeout(80);
      await button.click();
    };
    await clickSticker(0);
    if (!reduced) {
      await page.waitForTimeout(250);
      const middle = await inspect();
      assert.ok(Number(middle.progress) > 0 && Number(middle.progress) < 1);
      await page.screenshot({ path: `artifacts/sticker-viewer-${width}-opening.png` });
    }
    await page.waitForFunction(() => document.querySelector('.sticker-viewer')?.dataset.phase === 'open');
    const open = await inspect();
    assert.equal(await page.locator('.footer-signature').getAttribute('data-physical-stickers'), '5');
    assert.equal(open.meshes, 1); assert.ok(open.vertices > 100); assert.ok(open.depth > .001 && open.depth < .006);
    assert.equal(open.blur, 'blur(18px)'); assert.equal(open.overflow, 'hidden'); assert.equal(open.mainOverflow, false);
    assert.equal((await page.locator('.sticker-viewer').innerText()).trim(), '', 'inspection has no visible corner copy');
    assert.equal(await page.locator('.sticker-viewer button').count(), 1);
    assert.equal(await page.locator('.sticker-viewer-close').getAttribute('aria-label'), 'Close sticker viewer');
    await page.screenshot({ path: `artifacts/sticker-viewer-${width}-front.png` });
    // Keyboard rotation goes all the way around both printed faces.
    await page.locator('.sticker-viewer-canvas').focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    const back = await inspect();
    assert.notDeepEqual(back.quaternion, open.quaternion);
    await page.screenshot({ path: `artifacts/sticker-viewer-${width}-back.png` });
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/sticker-viewer-${width}-full-turn.png` });
    await page.keyboard.press('Home'); await page.waitForTimeout(500);
    await page.mouse.move(width / 2, height / 2); await page.mouse.down();
    await page.mouse.move(width * .75, height * .57, { steps: 15 }); await page.mouse.up();
    await page.waitForTimeout(400);
    const dragged = await inspect(); assert.notDeepEqual(dragged.quaternion, open.quaternion);
    await page.screenshot({ path: `artifacts/sticker-viewer-${width}-drag.png` });
    await page.keyboard.press('Escape');
    if (!reduced) { await page.waitForTimeout(220); await page.screenshot({ path: `artifacts/sticker-viewer-${width}-closing.png` }); }
    await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await page.locator('.footer-sticker-trigger[data-sticker="0"]').evaluate(element => document.activeElement === element), true);
    assert.equal((await inspect()).meshes, 0);
    assert.equal(await page.locator('.footer-signature').getAttribute('data-physical-stickers'), '6');
    if (study) { results.push({ width, open, back, dragged }); await page.close(); continue; }
    // Every individual sticker opens its own geometry and returns cleanly.
    for (let index = 1; index < 6; index++) {
      await clickSticker(index);
      await page.waitForFunction(() => document.querySelector('.sticker-viewer').dataset.phase === 'open');
      assert.equal((await inspect()).sticker, String(index));
      await page.screenshot({ path: `artifacts/sticker-viewer-${width}-sticker-${index}.png` });
      await page.locator('.sticker-viewer-canvas').focus();
      for (let turn = 0; turn < 8; turn++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(450);
      await page.screenshot({ path: `artifacts/sticker-viewer-${width}-sticker-${index}-back.png` });
      await page.locator('.sticker-viewer-close').click();
      await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    }
    // Escape during flight, then repeat opening and resize while in motion.
    await page.locator('.footer-sticker-trigger').first().focus(); await page.keyboard.press('Enter');
    await page.waitForTimeout(reduced ? 20 : 120); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    await page.locator('.footer-sticker-trigger').nth(2).focus(); await page.keyboard.press('Enter');
    await page.setViewportSize({ width: width + 24, height: height - 30 });
    await page.waitForFunction(() => document.querySelector('.sticker-viewer').dataset.phase === 'open');
    await page.mouse.click(12, Math.round((height - 30) / 2));
    await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal((await inspect()).mainOverflow, false);
    await page.locator('.footer-back-to-top').click();
    await page.waitForFunction(() => scrollY === 0 && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    results.push({ width, reduced, open, back, dragged });
    console.log('PASS six stickers, 360 rotation, drag, blur, reverse, Escape, resize and scroll recovery', width);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`artifacts/sticker-viewer-${study ? 'study' : 'qa'}.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}

