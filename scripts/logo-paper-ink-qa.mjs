import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];
try {
  for (const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,700,false],[390,844,true]]) {
    const page = await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
    await page.goto('http://127.0.0.1:5180/');
    await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
    await page.waitForTimeout(1200);
    const entry=height*(reduced?.7:1.8), samples=[];
    if (reduced) {
      for (const paperPosition of [.7,.4,.1,.4,.7]) {
        await page.evaluate(y=>scrollTo(0,y),entry+height*(1-paperPosition));
        await page.waitForTimeout(150);
        const cut=+(await page.locator('.logo-journey-mark').getAttribute('data-paper-ink-cut'));
        assert.equal(cut,paperPosition>.5?1:0);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
        samples.push({paperPosition,cut});
      }
      results.push({width,height,reduced,samples});console.log('PASS',width,reduced);
      await page.close();continue;
    }
    for (const target of [.9,.5,.1,.5,.9]) {
      let lo=entry,hi=entry+height;
      for(let i=0;i<13;i++) {
        await page.evaluate(y=>scrollTo(0,y),(lo+hi)/2);await page.waitForTimeout(60);
        const cut=+(await page.locator('.logo-journey-mark').getAttribute('data-paper-ink-cut'));
        if(cut>target)lo=(lo+hi)/2;else hi=(lo+hi)/2;
      }
      const sample=await page.evaluate(()=>{
        const ink=document.querySelector('.logo-journey-paper-ink'),base=document.querySelector('.logo-journey-base'),mark=ink.parentElement;
        const r=ink.getBoundingClientRect(),b=base.getBoundingClientRect(),paper=document.querySelector('.folio-logo-pause').getBoundingClientRect();
        const cut=parseFloat(ink.style.clipPath.match(/[\d.]+/)[0])/100;
        return {cut,error:r.top+r.height*cut-paper.top,aligned:Math.abs(r.top-b.top)+Math.abs(r.left-b.left)+Math.abs(r.width-b.width),visibility:getComputedStyle(ink).visibility,white:getComputedStyle(base).filter,black:getComputedStyle(ink).filter,overflow:document.documentElement.scrollWidth-innerWidth,scrollY};
      });
      // Reduced motion moves directly to its centered anchor at its own threshold.
      assert.ok(Math.abs(sample.error)<1,JSON.stringify(sample));
      assert.equal(sample.aligned,0);assert.equal(sample.overflow,0);assert.equal(sample.visibility,'visible');
      assert.ok(Math.abs(sample.cut-target)<.025,JSON.stringify(sample));
      samples.push({target,...sample});
      if(target===.5&&samples.length===2)await page.screenshot({path:`artifacts/logo-paper-ink-${width}-${reduced}.png`});
    }
    assert.ok(Math.abs(samples[1].scrollY-samples[3].scrollY)<2);
    results.push({width,height,reduced,samples});console.log('PASS',width,reduced);
    await page.close();
  }
  assert.deepEqual(errors,[]);
} finally {
  await writeFile('artifacts/logo-paper-ink-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
