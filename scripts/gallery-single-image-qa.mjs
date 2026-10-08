import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [], errors = [];
const source = await (await (await browser.newPage()).request.get('http://localhost:5173/src/project-gallery.js')).text();
const gsapPath = source.match(/from\s*["']([^"']*gsap[^"']*)["']/)[1];
const nearRect = (a, b, label, tolerance = 1) => {
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(a[key] - b[key]) < tolerance, `${label} ${key}: ${a[key]} vs ${b[key]}`);
};
try {
  for (const [width, height] of [[1440, 900], [820, 1000], [390, 844], [320, 640]]) {
    if(process.argv[2] === 'remaining' && width === 1440) continue;
    if(process.argv[2] === '320' && width !== 320) continue;
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    await page.evaluate(async path => { window.galleryQaGsap = (await import(path)).default; }, gsapPath);
    await page.locator('.studio-link[href="#projects"]').click();
    await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.locator('.orbit-card[data-index="0"]').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1300);
    const orbitState = () => page.evaluate(() => ({
      angle: Number(document.querySelector('.orbit-stage').dataset.angle), y: scrollY,
      cards: [...document.querySelectorAll('#projects .orbit-card')].map(card => card.getBoundingClientRect().toJSON()),
    }));
    const imageState = () => page.evaluate(() => {
      const viewport = document.querySelector('.orbit-image-viewport');
      const slide = viewport ? Math.round(viewport.scrollLeft / viewport.clientWidth) : 0;
      const image = document.querySelectorAll('.orbit-detail-media img')[slide];
      return { slide, src: image.getAttribute('src'), rect: image.getBoundingClientRect().toJSON(), natural: [image.naturalWidth, image.naturalHeight], title: document.querySelector('#orbit-detail-title').textContent };
    });
    const idle = () => page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'idle');
    const seekFlight = p => page.evaluate(p => {
      const shell = document.querySelector('#project-gallery .orbit-shell');
      const tween = window.galleryQaGsap.getTweensOf(shell).filter(tween => tween.duration() > 0).at(-1);
      if (!tween) throw new Error('No active flight');
      tween.parent.pause().progress(p);
      return document.querySelector('.orbit-travelling-surface')?.getBoundingClientRect().toJSON();
    }, p);
    const before = await orbitState();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-detail');
    const launch = await seekFlight(0);
    nearRect(launch, before.cards[5], 'opening starts on the real 3D card');
    await seekFlight(.5);
    assert.equal(await page.locator('.orbit-travelling-surface img').count(), 1);
    assert.equal(await page.locator('.orbit-detail-media').evaluate(el=>getComputedStyle(el).visibility), 'hidden');
    assert.ok(await page.locator('.orbit-travelling-surface').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('img').getBoundingClientRect();return Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1;}));
    await page.screenshot({ path: `artifacts/gallery-consistency-${width}-opening.png` });
    await seekFlight(1); await idle();
    const poster = await imageState(); console.log('poster',width,JSON.stringify(poster));
    assert.ok(Math.abs(poster.rect.width / poster.rect.height - poster.natural[0] / poster.natural[1]) < .001, 'natural poster proportions');
    await page.locator('.orbit-image-controls button').last().click();
    await page.waitForFunction(() => {
      const viewport = document.querySelector('.orbit-image-viewport');
      return Math.round(viewport.scrollLeft / viewport.clientWidth) === 1
        && Math.abs(viewport.scrollLeft - (viewport.scrollWidth - viewport.clientWidth)) <= 1;
    });
    // Bring the next-work button into view before recording A. Playwright's
    // click otherwise scrolls mobile detail after the baseline was captured.
    await page.locator('.orbit-detail-next').scrollIntoViewIfNeeded();
    const original = await imageState();
    assert.equal(original.slide, 1);
    await page.locator('.orbit-detail-next').click(); await idle();
    await page.locator('.orbit-detail-prev').click(); await idle();
    const restored = await imageState();
    assert.equal(restored.slide, original.slide); assert.equal(restored.src, original.src);
    nearRect(restored.rect, original.rect, 'A -> B -> A detail geometry');
    await page.screenshot({ path: `artifacts/gallery-consistency-${width}-detail.png` });
    await page.locator('.orbit-back').click();
    await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-overview');
    const landing = await seekFlight(.999);
    nearRect(landing, before.cards[5], 'return flight ends on the original card');
    await seekFlight(1);
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open && document.activeElement.classList.contains('orbit-card'));
    await page.waitForTimeout(150);
    const after = await orbitState();
    assert.ok(Math.abs(after.angle - before.angle) < .0001, 'same orbit angle');
    before.cards.forEach((rect, i) => nearRect(after.cards[i], rect, `card ${i} restored`));
    assert.ok(Math.abs(after.y - before.y) < 1, 'same page scroll');
    assert.equal(await page.locator('.orbit-travelling-art').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow === 'hidden'), false);
    await page.screenshot({ path: `artifacts/gallery-consistency-${width}-return.png` });
    if (width === 1440) {
      const side = after.cards[6];
      await page.mouse.move(side.x + side.width / 2, side.y + side.height / 2);
      const sideBefore = await orbitState();
      await page.mouse.click(side.x + side.width / 2, side.y + side.height / 2);
      await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-detail');
      nearRect(await seekFlight(0), sideBefore.cards[6], 'tilted card launch');
      await seekFlight(.5);
      await page.screenshot({ path: 'artifacts/gallery-consistency-desktop-tilted-flight.png' });
      await seekFlight(1); await idle();
      await page.locator('.orbit-back').click();
      await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-overview');
      nearRect(await seekFlight(.999), sideBefore.cards[6], 'tilted card landing');
      await seekFlight(1);
      await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
      await page.waitForTimeout(100);
      nearRect((await orbitState()).cards[6], sideBefore.cards[6], 'tilted card restored');
    }
    // Escape while entry is still flying must cancel pending async work.
    await page.locator('.orbit-card[data-index="0"]').focus(); await page.keyboard.press('Home');
    await page.waitForTimeout(1000); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#project-gallery').open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.orbit-travelling-art').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow === 'hidden'), false);
    if (width === 1440) {
      await page.locator('.orbit-card[data-index="0"]').focus(); await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-detail');
      await page.setViewportSize({ width: 1420, height: 880 }); await idle();
      const resized = await imageState();
      assert.ok(Math.abs(resized.rect.x + resized.rect.width / 2 - 710) < 1, 'resize keeps detail centered');
      await page.locator('.orbit-close').click();
      await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
      assert.equal(await page.locator('.orbit-travelling-art').count(), 0);
      await page.setViewportSize({ width, height });
    }
    // Reduced motion keeps the same navigation and return contract.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:5173/?gallery-consistency=reduced', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    await page.locator('.studio-link[href="#projects"]').click();
    await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.locator('.orbit-card[data-index="0"]').focus(); await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#project-gallery').open);
    await idle();
    await page.locator('.orbit-detail-next').click(); await idle();
    await page.locator('.orbit-detail-prev').click(); await idle();
    await page.locator('.orbit-close').click();
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    results.push({ width, height, before, launch, landing, after, original, restored });
    console.log(`PASS ${width}: exact 3D endpoints, A-B-A geometry and slide, orbit return, single visible image, interrupted Escape and reduced motion`);
    await page.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.message); console.error(error); process.exitCode = 1;
} finally {
  await writeFile('artifacts/gallery-single-image-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}


