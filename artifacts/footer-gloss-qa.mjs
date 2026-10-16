import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const sharp = require('sharp');
const baseURL = process.env.QA_URL || 'http://localhost:5173/';
const prefix = process.env.QA_PREFIX || 'footer-gloss';
const study = process.argv.includes('study');
const preview = process.argv.includes('preview');
const onlyWidth = Number(process.argv.find(argument => /^\d+$/.test(argument)));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];

async function openPage(width, height, reduced = false) {
  const page = await browser.newPage({
    viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(preview ? { recordVideo: { dir: 'artifacts/footer-gloss-video', size: { width, height } } } : {}),
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|webgl/i.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, options, ...args) {
      return getContext.call(this, type, /webgl/.test(type) ? { ...options, preserveDrawingBuffer: true } : options, ...args);
    };
    window.__THREE_DEVTOOLS__ = { dispatchEvent(event) {
      const renderer = event.detail;
      if (!renderer?.isWebGLRenderer) return;
      const render = renderer.render.bind(renderer);
      renderer.render = function(scene, camera) {
        const model = scene.children.find(child => child.isGroup);
        if (model && renderer.domElement.classList.contains('footer-signature-canvas')) window.signatureQA = { renderer, scene, camera, model };
        return render(scene, camera);
      };
    } };
  });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen') && window.signatureQA);
  assert.equal(await page.locator('.footer-signature').getAttribute('data-stickers-loaded'), '6');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  return page;
}

async function state(page) {
  return page.evaluate(() => {
    const { renderer, scene, model } = signatureQA;
    const mesh = model.children.find(child => child.isMesh);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const shader = renderer.properties.get(materials[0]).uniforms;
    const gl = renderer.getContext();
      const finishSource = renderer.info.programs.map(program => gl.getShaderSource(program.fragmentShader) || '').join('\n');
    return {
      ...document.querySelector('.footer-signature').dataset,
      materials: materials.map(material => ({ color: material.color.getHexString(), roughness: material.roughness, metalness: material.metalness, clearcoat: material.clearcoat, clearcoatRoughness: material.clearcoatRoughness, environment: material.envMapIntensity })),
      materialGroups: [...new Set(mesh.geometry.groups.map(group => group.materialIndex))],
      clock: shader.chromeClock.value,
      lights: scene.children.filter(child => child.isLight).map(light => ({ type: light.type, intensity: light.intensity, position: light.position.toArray() })),
      sprites: model.children.filter(child => child.isSprite).length,
      glossyInk: /roughnessFactor\s*=\s*mix\(roughnessFactor \+ etch\*\.004, \.16, stickerInk.a\)/.test(finishSource) && /material.clearcoatRoughness = mix\(material.clearcoatRoughness, \.075, stickerInk.a\)/.test(finishSource),
      volumePattern: /dot\(chromePosition,vec3\(3.4,1.7,3.1\)\)/.test(finishSource),
      alphaCorners: [[0, 0], [gl.drawingBufferWidth - 1, 0], [0, gl.drawingBufferHeight - 1], [gl.drawingBufferWidth - 1, gl.drawingBufferHeight - 1]].map(([x, y]) => {
        const pixel = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); return pixel[3];
      }),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

async function capture(page, name, width) {
  await page.screenshot({ path: `artifacts/${prefix}-${width}-${name}.png` });
  const png = await page.locator('.footer-signature-canvas').evaluate(canvas => canvas.toDataURL());
  await sharp(Buffer.from(png.split(',')[1], 'base64')).trim().png().toFile(`artifacts/${prefix}-${width}-${name}-detail.png`);
}

try {
  if (preview) {
    const page = await openPage(1280, 800);
    await page.mouse.move(640, 400);
    await page.waitForTimeout(1000);
    await page.mouse.move(220, 200, { steps: 28 });
    await page.waitForTimeout(1300);
    await page.mouse.move(1050, 600, { steps: 38 });
    await page.waitForTimeout(1300);
    await page.mouse.move(640, 150, { steps: 30 });
    await page.waitForTimeout(1000);
    await page.mouse.move(640, 670, { steps: 34 });
    await page.waitForTimeout(1000);
    await page.locator('.signature-footer').dispatchEvent('pointerleave');
    await page.waitForTimeout(1800);
    const video = page.video();
    await page.close();
    await video.saveAs('artifacts/footer-gloss-preview.webm');
    console.log('Saved live pointer and reflection preview');
  } else if (study) {
    const page = await openPage(1440, 900, true);
    for (const [name, x, y] of [['front', -.24, 0], ['top', -.72, 0], ['bottom', .35, 0], ['left', -.24, -.65], ['right', -.24, .65]]) {
      await page.evaluate(({ x, y }) => {
        const { renderer, scene, camera, model } = signatureQA;
        model.rotation.set(x, y, 0);
        renderer.render(scene, camera);
      }, { x, y });
      await capture(page, name, 1440);
      results.push({ name, ...await state(page) });
    }
    await page.close();
  } else {
    for (const [width, height, reduced] of [[1440, 900, false], [820, 1000, false], [390, 844, false], [320, 640, true]]) {
      if (onlyWidth && onlyWidth !== width) continue;
      const page = await openPage(width, height, reduced);
      await page.mouse.move(width * .5, height * .5);
      await page.waitForTimeout(1200);
      const rest = await state(page);
      assert.equal(rest.materials.length, 1, 'the entire solid shares one finish');
      assert.deepEqual(rest.materialGroups, [0]);
      assert.equal(rest.sprites, 0, 'sparkle comes from physical reflection');
      assert.equal(rest.glossyInk, true, 'printed ink retains the glossy clearcoat in the compiled shader');
      assert.equal(rest.volumePattern, true, 'the pattern uses all three spatial axes');
      assert.deepEqual(rest.alphaCorners, [0, 0, 0, 0]);
      assert.equal(rest.overflow, false);
      await capture(page, 'rest', width);
      await page.mouse.move(width * .15, height * .15);
      await page.waitForTimeout(180);
      const turning = await state(page);
      await capture(page, 'turn', width);
      await page.waitForTimeout(1100);
      await capture(page, 'left', width);
      await page.mouse.move(width * .85, height * .85);
      await page.waitForTimeout(180);
      const reversing = await state(page);
      await capture(page, 'reverse', width);
      await page.waitForTimeout(1200);
      const right = await state(page);
      await capture(page, 'right', width);
      if (reduced) {
        assert.equal(rest.rotation, right.rotation);
        assert.equal(rest.clock, right.clock);
        assert.equal(rest.light, right.light);
      } else {
        assert.notEqual(rest.rotation, turning.rotation);
        assert.notEqual(turning.rotation, right.rotation);
        assert.notEqual(rest.light, right.light);
        assert.ok(right.clock > rest.clock);
        assert.ok(Number(turning.motion.split(',')[2]) > .03);
        assert.ok(Number(turning.motion.split(',')[0]) * Number(reversing.motion.split(',')[0]) < 0);
        await page.locator('.signature-footer').dispatchEvent('pointerleave');
        await page.waitForTimeout(1900);
        assert.ok(Math.abs(Number((await state(page)).rotation.split(',')[1])) < .04);
        // Reduced-motion toggling must stop the common surface clock and lights.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(150);
        const stopped = await state(page);
        await page.mouse.move(width * .05, height * .9);
        await page.waitForTimeout(250);
        const still = await state(page);
        assert.equal(still.rotation, stopped.rotation);
        assert.equal(still.clock, stopped.clock);
        assert.deepEqual(still.lights, stopped.lights);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
      await page.locator('.footer-direct').first().focus();
      assert.equal(await page.locator('.footer-direct').first().evaluate(element => document.activeElement === element), true);
      await page.locator('.footer-back-to-top').click();
      await page.waitForFunction(() => scrollY === 0 && !document.documentElement.classList.contains('is-colonnade-transitioning'));
      await page.waitForTimeout(200);
      const offscreen = await state(page);
      await page.waitForTimeout(250);
      assert.equal((await state(page)).clock, offscreen.clock, 'offscreen animation is paused');
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'), 'true');
      results.push({ width, reduced, rest, turning, reversing, right });
      console.log('PASS uniform finish, glossy ink, natural highlights, pointer reversal and lifecycle', width);
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`artifacts/${prefix}-qa.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
