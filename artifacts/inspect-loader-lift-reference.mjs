import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://tympanus.net/Tutorials/PagePreloadingEffect/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Reference title:', await page.title());
  const samples = [];
  for (let i = 0; i < 5; i++) {
    samples.push(await page.evaluate(() => ({ t: performance.now(), title: document.title,
      classes: document.querySelector('#ip-container')?.className,
      header: document.querySelector('.ip-header') && getComputedStyle(document.querySelector('.ip-header')).transform,
      body: document.body.innerText.slice(0, 160),
    })));
    if (i === 1 || i === 4) await page.screenshot({ path: `artifacts/loader-lift-reference-${i}.png` });
    await page.waitForTimeout(450);
  }
  console.log(JSON.stringify(samples));
} finally { await browser.close(); }
