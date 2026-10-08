import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [];
const cases = process.env.QA_DEEP ? [4,5,6].map(index => [1440,900,'no-preference',index]) :
  [[1440,900,'no-preference'], [820,1000,'no-preference'], [390,844,'no-preference'], [1440,900,'reduce']];
try {
  for (const [width, height, reducedMotion, forcedIndex] of cases) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    await page.locator('.studio-link[href="#projects"]').click();
    await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(1400);
    // Find an actually exposed rear surface, then click that visible pixel.
    const rear = await page.evaluate(forcedIndex => {
      if (forcedIndex !== undefined) {
        const card = document.querySelector(`.orbit-card[data-index="${forcedIndex}"]`);
        return { index: card.dataset.index, depth: card.dataset.depth };
      }
      for (const card of document.querySelectorAll('.orbit-card')) {
        if (+card.dataset.depth < .4) continue;
        const r = card.getBoundingClientRect();
        for (let x = Math.max(8, r.left + 8); x < Math.min(innerWidth - 8, r.right); x += 12) {
          const y = r.top + r.height / 2;
          if (document.elementFromPoint(x, y)?.closest('.orbit-card') === card) return { x, y, index: card.dataset.index, depth: card.dataset.depth };
        }
      }
    }, forcedIndex);
    assert.ok(rear, `exposed rear card at ${width}`);
    if (forcedIndex !== undefined) {
      await page.locator(`.orbit-card[data-index="${forcedIndex}"]`).focus();
      await page.keyboard.press('Enter');
    } else {
      await page.mouse.move(rear.x, rear.y);
      await page.mouse.click(rear.x, rear.y);
    }
    const samples = [], audits = [];
    if (width > 760 && reducedMotion !== 'reduce') {
      await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'to-detail');
      await page.evaluate(async () => {
        const url = performance.getEntriesByType('resource').map(r => r.name).find(url => /\/gsap\.js\?/.test(url));
        const { default: gsap } = await import(url);
        window.jumpTimeline = gsap.globalTimeline.getChildren().find(t => t.getChildren && t.getChildren().some(child => child.targets().some(target => typeof target.rearFlight === 'number')));
        window.jumpTimeline.pause(0);
        const { footprintsOverlap } = await import('/src/gallery-detail-flight.js');
        window.auditFlight = (timeline, returning = false) => {
          const camera = document.querySelector('.orbit-camera').getBoundingClientRect();
          const ringZ = new DOMMatrix(getComputedStyle(document.querySelector('.orbit-cards')).transform).m43;
          const vertices = (el, card) => {
            const matrix = new DOMMatrix(getComputedStyle(el).transform);
            const width = el.offsetWidth, height = el.offsetHeight;
            const left = card ? camera.left + el.offsetLeft : parseFloat(el.style.left);
            const top = card ? camera.top + el.offsetTop : parseFloat(el.style.top);
            return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => {
              const v = matrix.transformPoint({ x: x * width / 2, y: y * height / 2, z: 0 });
              return { x: left + width / 2 + v.x, y: top + height / 2 + v.y, z: v.z + (card ? ringZ : 0) };
            });
          };
          const obstacles = [...document.querySelectorAll('.orbit-card')].filter(el => el.style.visibility !== 'hidden')
            .map(el => ({ corners: vertices(el, true), top: el.getBoundingClientRect().top }));
          const collisions = [], invisible = [];
          let checked = 0;
          for (let n = 1; n < 100; n++) {
            const q = n / 100;
            timeline.time(1.25 * (returning ? 1 - q : q), false);
            const proxy = document.querySelector('.orbit-travelling-surface');
            const rect = proxy.getBoundingClientRect();
            if (rect.bottom < 8 || rect.top > innerHeight - 8) invisible.push(q);
            if (q > .8) continue;
            const corners = vertices(proxy, false);
            for (const obstacle of obstacles) {
              if (!footprintsOverlap(corners, obstacle.corners, 0)) continue;
              checked++;
              if (rect.bottom > obstacle.top - 14) collisions.push({ q, bottom: rect.bottom, top: obstacle.top });
            }
          }
          return { collisions, invisible, checked };
        };
      });
      const audit = await page.evaluate(() => window.auditFlight(window.jumpTimeline));
      audits.push({ direction: 'open', ...audit });
      assert.deepEqual(audit.collisions, [], 'no front-card intersections across the full flight');
      assert.deepEqual(audit.invisible, [], 'art stays visible during flight');
      let time = 0;
      for (const delay of [80, 100, 160, 220, 220, 300]) {
        time += delay / 1000;
        await page.evaluate(time => { window.jumpTimeline.time(time); }, time);
        samples.push(await page.locator('.orbit-travelling-surface').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, width: r.width, depth: +el.dataset.flightDepth, spin: +el.dataset.flightSpin, mask: el.parentElement.style.maskImage !== 'none' };
        }));
        if ([2, 4, 5].includes(samples.length)) await page.screenshot({ path: `artifacts/rear-jump-${width}-${samples.length}.png` });
      }
      assert.ok(samples[1].depth > samples[0].depth, 'moves towards screen immediately');
      assert.ok(Math.abs(samples[1].spin - samples[0].spin) > 2, 'spins during launch');
      assert.ok(samples[5].depth > samples[0].depth, 'crosses towards detail');
      assert.ok(samples[5].bottom > samples[4].bottom, 'lands after the arc');
      if (width === 1440) {
        await page.setViewportSize({ width: width - 40, height });
        await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'idle');
        await page.setViewportSize({ width, height });
      } else await page.evaluate(() => { window.jumpTimeline.play(); });
    }
    await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.scenePhase === 'idle');
    assert.equal(await page.locator('.orbit-travelling-art').count(), 0);
    await page.screenshot({ path: `artifacts/rear-jump-${width}-${reducedMotion}-detail.png` });
    await page.keyboard.press('Escape');
    if (width > 760 && reducedMotion !== 'reduce') {
      await page.evaluate(async () => {
        const url = performance.getEntriesByType('resource').map(r => r.name).find(url => /\/gsap\.js\?/.test(url));
        const { default: gsap } = await import(url);
        window.returnTimeline = gsap.globalTimeline.getChildren().find(t => t !== window.jumpTimeline && t.getChildren && t.getChildren().some(child => child.vars.rearFlight === 0));
        window.returnTimeline.pause(0);
      });
      const audit = await page.evaluate(() => window.auditFlight(window.returnTimeline, true));
      audits.push({ direction: 'return', ...audit });
      assert.deepEqual(audit.collisions, [], 'return flight clears front cards');
      assert.deepEqual(audit.invisible, [], 'return stays visible');
      await page.evaluate(() => { window.returnTimeline.time(.6); });
      await page.screenshot({ path: `artifacts/rear-jump-${width}-return.png` });
      await page.evaluate(() => { window.returnTimeline.play(); });
    }
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
    await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
    // Interrupt a second entry, then verify close restored all temporary state.
    await page.locator(`.orbit-card[data-index="${rear.index}"]`).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
    await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
    const cleanup = await page.evaluate(() => ({ proxies: document.querySelectorAll('.orbit-travelling-art').length, locked: document.body.style.overflow === 'hidden', overflow: document.documentElement.scrollWidth > innerWidth }));
    assert.deepEqual(cleanup, { proxies: 0, locked: false, overflow: false });
    assert.deepEqual(errors, []);
    results.push({ width, height, reducedMotion, rear, samples, audits, cleanup, errors });
    await page.close();
  }
  await writeFile(`artifacts/gallery-rear-jump${process.env.QA_DEEP ? '-deep' : ''}-qa.json`, JSON.stringify(results, null, 2));
  console.log('PASS rear click, elevated crossing, descent, detail, return, interrupted entry, cleanup, responsive and reduced motion', JSON.stringify(results));
} finally { await browser.close(); }

