import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];
try {
  for (const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,640,false],[390,844,true]]) {
    const page = await browser.newPage({ viewport: { width,height }, reducedMotion: reduced?'reduce':'no-preference',
      ...(width===1440 ? { recordVideo: { dir:'artifacts/loader-tempo-video',size:{width,height} } } : {}) });
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.windowRevealFrames=[];
      window.revealedAt=0;
      window.addEventListener('portfolio:reveal',()=>{window.revealedAt=performance.now();});
      const sample=()=>{
        const l=document.querySelector('#loading-screen'),g=document.querySelector('.tv-noise');
        if (l&&g || window.revealedAt&&performance.now()-revealedAt<600) {
          const s=g&&getComputedStyle(g),r=l?.getBoundingClientRect(),path=l?.querySelector('.loader-window-cover path');
          window.windowRevealFrames.push({t:performance.now(),loader:!!l,phase:l?.dataset.phase,mode:l?.dataset.reveal,
            p:Number(l?.dataset.revealProgress||0),w:Number(l?.dataset.revealWidth||0),h:Number(l?.dataset.revealHeight||0),
            y:scrollY,top:r?.top,rootOpacity:l&&getComputedStyle(l).opacity,fill:path?.getAttribute('fill'),d:path?.getAttribute('d'),
            ready:document.querySelector('.footer-signature')?.dataset.signatureReady,grain:Number(s?.opacity||0),visible:s?.visibility});
        }
        requestAnimationFrame(sample);
      };requestAnimationFrame(sample);
    });
    const settled=()=>page.waitForFunction(()=>!document.querySelector('#loading-screen')&&getComputedStyle(document.querySelector('.tv-noise')).opacity==='0.1');
    const check=async(visit,expectedY)=>{
      await page.waitForFunction(()=>document.querySelector('#loading-screen')?.dataset.phase==='opening');
      if(!reduced){
        await page.waitForFunction(()=>Number(document.querySelector('#loading-screen')?.dataset.revealProgress)>.3);
        const before=await page.evaluate(()=>scrollY);
        await page.mouse.wheel(0,400);await page.waitForTimeout(50);
        assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<2);
        await page.screenshot({path:`artifacts/loader-tempo-${width}-${visit}-middle.png`});
      }
      await settled();await page.waitForTimeout(100);
      const frames=await page.evaluate(()=>window.windowRevealFrames),opening=frames.filter(f=>f.phase==='opening');
      assert.ok(opening.length>2);
      assert.ok(frames.filter(f=>f.loader).every(f=>f.grain===0&&f.visible==='hidden'),'grain starts only after loader exits');
      assert.ok(opening.every(f=>f.ready==='true'),'3D complete before reveal');
      assert.ok(opening.every(f=>Math.abs(f.top)<1),'cover no longer slides away');
      assert.ok(Math.max(...opening.map(f=>f.y))-Math.min(...opening.map(f=>f.y))<2,'page stays stationary');
      if(!reduced){
        assert.ok(opening.every(f=>f.mode==='window'&&f.rootOpacity==='1'));
        assert.equal(new Set(opening.map(f=>f.fill)).size,1,'cover color stays consistent');
        assert.ok(opening.some(f=>f.w>.25&&f.w<.85&&f.h>.1&&f.h<.75));
        for(let i=1;i<opening.length;i++){
          assert.ok(opening[i].w>=opening[i-1].w&&opening[i].h>=opening[i-1].h,'opening never retracts');
        }
        assert.ok(opening.some(f=>f.w>=1&&f.h>=1),'all edges clear before cover removal');
        assert.ok(frames.some(f=>!f.loader&&f.grain>0&&f.grain<.1));
      }else assert.ok(opening.every(f=>f.mode==='reduced'&&!f.d));
      const state=await page.evaluate(()=>({y:scrollY,shield:!!document.querySelector('.loader-reveal-shield'),grain:document.querySelectorAll('.tv-noise.is-active').length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
      assert.ok(Math.abs(state.y-expectedY)<3);assert.equal(state.shield,false);assert.equal(state.grain,1);assert.equal(state.overflow,false);
      await page.screenshot({path:`artifacts/loader-tempo-${width}-${reduced?'reduced-':''}${visit}-settled.png`});
      results.push({width,height,reduced,visit,state,frames});console.log('PASS window reveal',width,reduced?'reduced':'normal',visit);
    };
    await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
    await check('fresh',0);
    if(width===1440||width===320){await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));}
    else if(width===820)await page.locator('#about').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const saved=await page.evaluate(()=>scrollY);
    await page.reload({waitUntil:'commit'});
    await check(width===1440||width===320?'footer-refresh':width===820?'about-refresh':'home-refresh',saved);
    const before=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,before>0?-500:500);
    await page.waitForFunction(previous=>Math.abs(scrollY-previous)>100,before);
    await page.close();
  }
  assert.deepEqual(errors,[]);
}finally{
  await writeFile('artifacts/loader-tempo-qa.json',JSON.stringify({results,errors},null,2));
  await browser.close();
}
