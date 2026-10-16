import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    window.referenceFrames = [];
    let start;
    const sample = () => {
      start ??= performance.now();
      const paths = [...document.querySelectorAll('svg path')].filter(p => /M0\s*,?\s*0H|M0 0H/.test(p.getAttribute('d') || ''));
      window.referenceFrames.push({ t: performance.now(), paths: paths.map(p => ({ d: p.getAttribute('d'), fill: p.getAttribute('fill'), parent: p.parentElement.tagName })) });
      if (performance.now() - start < 10000) requestAnimationFrame(sample);
    }; requestAnimationFrame(sample);
  });
  await page.goto('https://www.raviklaassens.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Reference title:', await page.title());
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/loader-window-reference-${i}.png` });
  }
  console.log((await page.locator('body').innerText()).slice(0, 180));
  await writeFile('artifacts/loader-window-reference.json', JSON.stringify(await page.evaluate(() => window.referenceFrames), null, 2));
} finally { await browser.close(); }
