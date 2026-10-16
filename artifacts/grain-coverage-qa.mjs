import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const sharp = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
try {
  for (const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,640,true]]) {
    const page = await browser.newPage({ viewport: { width,height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror',e=>errors.push(e.message));
    if(width===1440) await page.route(/Sidang.*\.png/,async route=>{
      const response=await route.fetch(); await new Promise(resolve=>setTimeout(resolve,2500)); await route.fulfill({response});
    });
    await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.tv-noise-canvas');
    await page.evaluate(()=>{window.grainQaNode=document.querySelector('.tv-noise');window.grainQaCanvas=window.grainQaNode.querySelector('canvas');});
    if(width===1440) {
      assert.equal(await page.locator('#loading-screen').count(),1);
      assert.ok(await page.evaluate(()=>Number(getComputedStyle(grainQaNode).zIndex)>Number(getComputedStyle(document.querySelector('#loading-screen')).zIndex)));
      await page.screenshot({path:'artifacts/grain-unified-loader.png'});
    }
    await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
    const sample=()=>page.evaluate(()=>Array.from(grainQaCanvas.getContext('2d').getImageData(0,0,16,16).data));
    const first=await sample();await page.waitForTimeout(180);
    if(reduced) assert.deepEqual(first,await sample()); else assert.notDeepEqual(first,await sample());
    const coverage=async()=>{
      const state=await page.evaluate(()=>{
        const el=document.querySelector('.tv-noise'),s=getComputedStyle(el),r=el.getBoundingClientRect();
        return {same:el===grainQaNode&&el.querySelector('canvas')===grainQaCanvas,count:document.querySelectorAll('.tv-noise').length,opacity:s.opacity,blend:s.mixBlendMode,pointer:s.pointerEvents,rect:[r.x,r.y,r.width,r.height],paused:el.hasAttribute('data-noise-paused')};
      });
      assert.equal(state.same,true);assert.equal(state.count,1);assert.equal(state.opacity,'0.1');assert.equal(state.blend,'normal');assert.equal(state.pointer,'none');assert.deepEqual(state.rect,[0,0,width,height]);assert.equal(state.paused,reduced);
      return state;
    };
    await coverage();
    await page.screenshot({path:`artifacts/grain-unified-${width}-hero.png`});
    await page.locator('#about').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
    await page.locator('.studio-link[href="#projects"]').click();
    if(!reduced){
      await page.waitForFunction(()=>document.querySelector('.colonnade-overlay')?.classList.contains('is-active'));
      assert.ok(await page.evaluate(()=>Number(getComputedStyle(grainQaNode).zIndex)>Number(getComputedStyle(document.querySelector('.colonnade-overlay')).zIndex)));
      await coverage();
    }
    await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.locator('#projects .orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');await page.waitForTimeout(600);await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#project-gallery').open&&document.querySelector('#project-gallery').dataset.scenePhase==='idle');
    assert.equal(await page.locator('#project-gallery > .tv-noise').count(),1);await coverage();
    const modalFirst=await sample();await page.waitForTimeout(180);if(!reduced)assert.notDeepEqual(modalFirst,await sample());
    await page.screenshot({path:`artifacts/grain-unified-${width}-detail.png`});
    // A fixed blue swatch proves that the same frozen grain composites to the
    // same actual pixels in the native dialog and on the normal document.
    if(reduced){
      await page.evaluate(()=>{
        const p=document.createElement('div');p.id='grain-qa-swatch';p.style.cssText='position:fixed;left:30px;top:110px;width:100px;height:100px;background:#20235b;z-index:2000002;pointer-events:none';document.querySelector('#project-gallery').append(p);
      });
      const clip={x:32,y:112,width:96,height:96};
      const modal=await sharp(await page.screenshot({clip})).raw().toBuffer();
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#project-gallery').open);
      await page.evaluate(()=>document.body.append(document.querySelector('#grain-qa-swatch')));
      const documentPixels=await sharp(await page.screenshot({clip})).raw().toBuffer();
      assert.ok(modal.equals(documentPixels),'identical blue + grain produces identical pixels in modal and page');
      await page.locator('#grain-qa-swatch').evaluate(el=>el.remove());
    } else {
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#project-gallery').open);
    }
    assert.equal(await page.locator('body > .tv-noise').count(),1);await coverage();
    await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(1400);
    await coverage();assert.equal(await page.locator('.signature-footer').evaluate(el=>getComputedStyle(el,'::before').content),'none');
    await page.screenshot({path:`artifacts/grain-unified-${width}-footer.png`});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('.footer-back-to-top').click();await page.waitForTimeout(2100);await coverage();
    results.push({width,reduced,coverage:true,modal:true,footerSingleLayer:true});console.log('PASS unified grain',width);
    await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile('artifacts/grain-coverage-qa.json',JSON.stringify(results,null,2));
} finally {await browser.close();}
