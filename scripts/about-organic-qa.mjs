import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1792, height: 950 } });
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const layout = () => page.evaluate(() => {
  const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right }; };
  return {
    viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth - innerWidth,
    copies: [...document.querySelectorAll('.about-reading-copy')].map(el => ({ ...rect(el), font:getComputedStyle(el).fontSize, opacity:getComputedStyle(el).opacity })),
    photo: rect(document.querySelector('.portrait-core')), photoTransform: getComputedStyle(document.querySelector('.portrait-core')).transform,
    phase: document.querySelector('#about').dataset.cinematicPhase,
    absorb: document.querySelector('#about').dataset.absorbProgress,
    mode: document.querySelector('.about-absorb-dust')?.dataset.erosion,
  };
});
async function seek(amount) {
  await page.evaluate(amount => {
    const section = document.querySelector('#about');
    const words = section.querySelectorAll('.about-reading-word').length;
    const groups = [...section.querySelectorAll('.about-reading-copy')];
    const text = groups.reduce((sum, el) => sum + Math.round(el.querySelectorAll('.about-reading-word').length * 5.5), 0);
    const total = parseFloat(section.style.getPropertyValue('--about-scroll-distance'));
    const p = (text + amount * 160) / total;
    window.scrollTo({ top:scrollY + section.getBoundingClientRect().top + (section.offsetHeight - innerHeight) * p, behavior:'instant' });
  }, amount);
  await page.waitForTimeout(1700);
}
try {
  if (!process.env.QA_RESPONSIVE_ONLY) {
  await page.goto('http://localhost:5173/', { waitUntil:'networkidle' });
  await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
  await page.locator('.studio-link[href="#about"]').click();
  await page.waitForFunction(() => location.hash === '#about' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.mouse.move(0,0);
  for (const p of [0, .25, .5, .72, 1, .5, 0]) {
    await seek(p);
    const state = await layout();
    assert.equal(state.overflow,0); assert.equal(state.photoTransform,'none');
    results.push({ test:'real scroll', requested:p, ...state });
    await page.screenshot({ path:`artifacts/about-organic-${p}-${results.length}.png` });
  }
  // Test the renderer's reversibility and pause stability on a hidden clone,
  // without changing the live animation's controller or progress.
  const deterministic = await page.evaluate(async () => {
    const { createAboutTextDust } = await import('/src/about-text-dust.js');
    const original = document.querySelector('.about-reading-stage');
    const clone = original.cloneNode(true);
    clone.querySelectorAll('canvas,.about-chapter').forEach(el => el.remove());
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.style.cssText += ';position:fixed!important;top:0;left:0;visibility:hidden;pointer-events:none';
    original.parentElement.append(clone);
    const copies = [...clone.querySelectorAll('.about-reading-copy')];
    const dust = createAboutTextDust(clone, clone.querySelector('.about-art-showcase'), copies, copies.map(el => [...el.querySelectorAll('.about-reading-word')]));
    dust.measure();
    const canvas = clone.querySelector('.about-absorb-dust');
    dust.render(.43); const first = canvas.toDataURL();
    dust.render(.76); dust.render(.43); const reverse = canvas.toDataURL();
    dust.render(.43); const pause = canvas.toDataURL();
    const begin = performance.now();
    for (let i=0;i<60;i++) dust.render(.2+i*.009);
    const ms = (performance.now()-begin)/60;
    const complete = dust.render(1).complete;
    dust.dispose(); clone.remove();
    return { reverseExact:first===reverse, pauseExact:reverse===pause, averageRenderMs:ms, complete };
  });
  assert.equal(deterministic.reverseExact,true); assert.equal(deterministic.pauseExact,true); assert.equal(deterministic.complete,true);
  results.push({ test:'deterministic render',...deterministic });
  }
  for (const [width,height] of [[1440,900],[1102,700],[820,1180],[390,844],[360,640]]) {
    await page.setViewportSize({ width,height });
    await page.goto('http://localhost:5173/', { waitUntil:'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    await page.locator('.studio-link[href="#about"]').click();
    await page.waitForFunction(() => location.hash === '#about' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    if (width>=768) await seek(0);
    else await page.waitForTimeout(900);
    const state = await layout();
    assert.equal(state.overflow,0); assert.equal(state.photoTransform,'none');
    results.push({ test:'responsive',...state });
    await page.screenshot({ path:`artifacts/about-organic-${width}.png` });
  }
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.waitForTimeout(700);
  results.push({ test:'reduced motion',...await layout() });
  await page.locator('.studio-link[href="#projects"]').click();
  await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
  results.push({ test:'Work reachable', locked:await page.evaluate(() => document.documentElement.classList.contains('lenis-stopped')) });
  assert.deepEqual(errors,[]);
} finally {
  await writeFile(`artifacts/about-organic${process.env.QA_RESPONSIVE_ONLY ? '-responsive' : ''}-qa.json`,JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors},null,2)); await browser.close();
}
