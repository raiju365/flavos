import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [], errors = [];
try {
  for (const [width, height, touch = false] of [[1440, 900], [1280, 900], [1366, 1024, true], [820, 1000, true], [390, 844, true], [320, 640, true]]) {
    if(process.argv[2] && width !== Number(process.argv[2])) continue;
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    const distances = await page.evaluate(async () => (await import('/src/about-work-handoff.js')).getWorkHandoffDistances());
    assert.deepEqual(distances, touch || width < 1200 ? { descent: 4, orbitHold: 0 } : { descent: 6, orbitHold: 2 });
    const handoff = (distances.descent + distances.orbitHold) * 100;
    const state = () => page.evaluate(() => {
      const about = document.querySelector('#about'), works = document.querySelector('#projects');
      const portrait = about.querySelector('.portrait-orbit').getBoundingClientRect();
      return {
        y: scrollY, complete: about.dataset.absorbComplete,
        entry: Number(works.dataset.entryProgress), workTop: works.getBoundingClientRect().top,
        portrait: { width: portrait.width, height: portrait.height },
        translate: getComputedStyle(about.querySelector('.about-reading-stage')).translate,
        copies: [...about.querySelectorAll('.about-reading-copy')].map(el => getComputedStyle(el).opacity),
        overflow: document.documentElement.scrollWidth - innerWidth,
        cards: [...works.querySelectorAll('.orbit-card')].map(el => Number(el.dataset.arrival)),
        locked: document.body.style.overflow === 'hidden',
      };
    });
    const approach = async () => {
      // Stop the previous wheel's Lenis interpolation through real navigation
      // before seeking a test position. Native scrollTo during a wheel tween
      // is overwritten by the next Lenis frame.
      await page.locator('.studio-link[href="#about"]').click();
      await page.waitForFunction(() => location.hash === '#about' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
      await page.waitForTimeout(1300); // Same-section navigation uses a smooth scroll.
      await page.evaluate(handoff => {
        const about = document.querySelector('#about');
        const total = parseFloat(about.style.getPropertyValue('--about-scroll-distance'));
        scrollTo({ top: scrollY + about.getBoundingClientRect().top + (about.offsetHeight - innerHeight) * ((total - handoff) / total - .015), behavior: 'instant' });
      }, handoff);
      await page.waitForTimeout(600);
    };
    await approach();
    const before = await state();
    // Real wheel overshoots the absorption boundary and exercises the gate.
    await page.mouse.wheel(0, height * 2);
    await page.waitForTimeout(2000);
    const held = await state();
    assert.equal(held.complete, 'true');
    assert.equal(held.entry, 0);
    assert.ok(Math.abs(held.workTop - height * (1 + distances.descent + distances.orbitHold)) < 2, 'departure starts at absorption endpoint');
    await page.mouse.wheel(0, height * 1.5);
    await page.waitForTimeout(1000);
    const released = await state();
    assert.ok(released.y > held.y + height, `scroll released at ${width}`);
    assert.ok(Math.abs(released.entry - 1.5 / distances.descent) < .002, `cards depart at ${width}`);
    assert.deepEqual(released.portrait, before.portrait, 'portrait never scales');
    await page.screenshot({ path: `artifacts/about-works-release-${width}-midway.png` });
    const settleScroll = height * (distances.descent - 1.5 + (distances.orbitHold || 2) * .5);
    await page.mouse.wheel(0, settleScroll);
    await page.waitForTimeout(1100);
    const settled = await state();
    assert.equal(settled.entry, 1);
    assert.ok(settled.cards.every(progress => progress === 1));
    assert.equal(settled.locked, false);
    if (distances.orbitHold) {
      assert.ok(settled.workTop > height && settled.workTop < height * 3, 'settled orbit remains visible before Work arrives');
      const firstAngle = Number(await page.locator('.orbit-stage').getAttribute('data-angle'));
      await page.waitForTimeout(800);
      const nextAngle = Number(await page.locator('.orbit-stage').getAttribute('data-angle'));
      assert.ok(Math.abs(nextAngle - firstAngle) > .01, '3D orbit rotates during the desktop hold');
    }
    await page.screenshot({ path: `artifacts/about-works-release-${width}-settled.png` });
    await page.mouse.wheel(0, -settleScroll);
    await page.waitForTimeout(1600);
    const reverse = await state();
    assert.ok(Math.abs(reverse.entry - released.entry) < .002, `reverse follows the same path: ${JSON.stringify({ released, reverse })}`);
    await approach();
    const restored = await state();
    assert.equal(restored.entry, 0);
    assert.deepEqual(restored.portrait, before.portrait);
    // Re-crossing must finish too, rather than retaining a stale gate.
    await page.mouse.wheel(0, height * 2);
    await page.waitForTimeout(2000);
    const heldAgain = await state();
    await page.mouse.wheel(0, height);
    await page.waitForTimeout(900);
    const releasedAgain = await state();
    assert.ok(releasedAgain.entry > .8 / distances.descent, `second crossing releases: ${JSON.stringify({ restored, heldAgain, releasedAgain })}`);
    await page.locator('.studio-link[href="#projects"]').click();
    await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(1300);
    assert.equal((await state()).entry, 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.studio-link[href="#about"]').click();
    await page.waitForFunction(() => location.hash === '#about' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(300);
    const reduced = await state();
    assert.deepEqual(reduced.copies, ['1', '1']);
    assert.equal(parseFloat(reduced.translate) || 0, 0);
    assert.ok([before, held, released, settled, reverse, restored, reduced].every(s => s.overflow === 0));
    results.push({ width, height, touch, distances, before, held, released, settled, reverse, restored, reduced });
    console.log(`PASS ${width}×${height}: wheel release, second crossing, reverse, portrait size, navigation, reduced motion, overflow`);
    await page.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile('artifacts/about-works-release-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
