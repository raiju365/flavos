import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';

const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium} = require('playwright');
const browser = await chromium.launch({channel:'msedge', headless:true});
const directory = 'artifacts/navbar-entrance';
const results = [], errors = [];
await mkdir(directory, {recursive:true});

async function ready(page) {
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'), null, {timeout:90000});
  await page.waitForTimeout(450);
}

async function sample(page) {
  return page.locator('.studio-header').evaluate(header => {
    const mark = header.querySelector('.logo-journey-mark');
    const box = mark.getBoundingClientRect();
    const original = header.querySelector('.studio-brand img').getBoundingClientRect();
    return {
      progress:+document.querySelector('#hero').dataset.entryProgress,
      reveal:+header.style.getPropertyValue('--hero-logo-reveal'),
      visible:getComputedStyle(header).visibility,
      inert:header.inert,
      overflow:document.documentElement.scrollWidth-innerWidth,
      centerError:Math.abs(box.x+box.width/2-(original.x+original.width/2)),
      markWidth:box.width,
      translations:[new DOMMatrix(getComputedStyle(mark.querySelector('.logo-journey-monochrome')).transform).m42],
      intact:mark.querySelectorAll('.logo-journey-base').length===2 && !mark.querySelector('.logo-entrance-slice') && getComputedStyle(mark.querySelector('.logo-journey-monochrome')).clipPath==='none',
      sources:[...mark.querySelectorAll('.logo-journey-base')].every(image => image.complete && image.naturalWidth>0),
      monochrome:getComputedStyle(mark.querySelector('.logo-journey-monochrome')).visibility,
      material:getComputedStyle(mark.querySelector('.logo-style-cycle')).visibility,
      inkCuts:[...mark.querySelectorAll('.logo-journey-paper-ink')].map(ink => ink.style.clipPath),
    };
  });
}

try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if(event.type()==='error') errors.push(event.text()); });
  await page.goto(process.env.QA_URL || 'http://127.0.0.1:4173/');
  await ready(page);
  for(const [width,height] of [[1440,900],[820,1000],[390,844],[320,700]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(300);
    const forward = new Map();
    for(const progress of [.58,.68,.74,.80,.86,.94,.86,.80,.74,.68,.58,.94]) {
      await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), height*1.8*progress);
      await page.waitForTimeout(180);
      const state = await sample(page);
      assert.equal(state.overflow,0);
      assert.ok(state.sources);
      assert.ok(state.intact,'The FA silhouette must remain a single intact mark');
      assert.ok(state.centerError<.1,JSON.stringify(state));
      if(progress===.58) assert.equal(state.visible,'hidden');
      else assert.equal(state.visible,'visible');
      if(progress===.94) {
        assert.equal(state.inert,false);
        assert.ok(state.translations.every(value => Math.abs(value)<.01));
      } else assert.equal(state.inert,true);
      const prior = forward.get(progress);
      if(prior) state.translations.forEach((value,index) => assert.ok(Math.abs(value-prior.translations[index])<.15,'Reverse entrance must retrace the same position'));
      else forward.set(progress,state);
      results.push({width,height,targetProgress:progress,...state});
    }
    await page.screenshot({path:`${directory}/settled-${width}.png`});
    await page.evaluate(y => scrollTo({top:y,behavior:'instant'}),height*1.8*.78);
    await page.waitForTimeout(180);
    await page.screenshot({path:`${directory}/intact-mid-${width}.png`});
    // The existing material exchange and paper boundary must survive the new wrapper.
    for(const fraction of [.9,.5,.05,-.2,.5,.9]) {
      await page.locator('.folio-logo-pause').evaluate((element,fraction) => scrollTo({top:scrollY+element.getBoundingClientRect().top-innerHeight*fraction,behavior:'instant'}), fraction);
      await page.waitForTimeout(220);
      const state = await sample(page);
      assert.ok(state.monochrome==='visible'||state.material==='visible');
      assert.equal(new Set(state.inkCuts).size,1);
      assert.equal(state.overflow,0);
      assert.ok(state.translations.every(value => Math.abs(value)<.01));
      results.push({width,height,paperPosition:fraction,...state});
    }
    console.log(`PASS ${width}×${height}: entrance, reverse, alignment, paper/material handoff`);
  }
  // Restoring a partly revealed logo must reproduce its state without a timed replay.
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  await page.evaluate(() => scrollTo({top:innerHeight*1.8*.78,behavior:'instant'}));
  await page.waitForTimeout(250);
  const before = await sample(page);
  await page.reload();
  await ready(page);
  const restored = await sample(page);
  assert.ok(Math.abs(restored.progress-before.progress)<.002,JSON.stringify({before,restored}));
  before.translations.forEach((value,index) => assert.ok(Math.abs(value-restored.translations[index])<.2));
  results.push({restore:{before,restored}});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(300);
  for(const progress of [.58,.75,.94,.75,.58]) {
    await page.evaluate(y => scrollTo({top:y,behavior:'instant'}),844*.7*progress);
    await page.waitForTimeout(200);
    const state = await sample(page);
    assert.ok(state.translations.every(value => value===0));
    assert.equal(state.overflow,0);
    results.push({reduced:true,...state});
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS restore and reduced motion; ${results.length} sampled states; zero browser errors`);
} finally {
  await writeFile(`${directory}/qa.json`,JSON.stringify({results,errors},null,2));
  await browser.close();
}
