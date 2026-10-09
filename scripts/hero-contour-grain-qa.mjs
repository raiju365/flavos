import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
try {
  for (const [width, height, reduced, touch, fallback] of [[1440,900,false,false,false],[820,1000,false,false,false],[390,844,false,true,false],[320,700,false,true,false],[390,844,true,false,false],[390,844,false,false,true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: touch, isMobile: touch });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    if (fallback) await page.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) { return /^webgl/.test(type) ? null : get.call(this,type,...args); };
    });
    await page.goto('http://127.0.0.1:5174/');
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    await page.waitForTimeout(1100);
    const grain = () => page.locator('.tv-noise').evaluate(el => {
      const c = el.querySelector('canvas'), data = c.getContext('2d').getImageData(0,0,32,32).data;
      return { opacity: getComputedStyle(el).opacity, blend: getComputedStyle(el).mixBlendMode, paused: el.hasAttribute('data-noise-paused'), sample: Array.from(data.slice(0,128)), variation: new Set(data).size, overflow: document.documentElement.scrollWidth-innerWidth };
    });
    const first = await grain(); await page.waitForTimeout(180); const second = await grain();
    assert.equal(first.opacity,'0.1'); assert.equal(first.blend,'normal'); assert.ok(first.variation>30); assert.equal(first.overflow,0);
    if (reduced) assert.deepEqual(first.sample,second.sample); else assert.notDeepEqual(first.sample,second.sample);
    // Reproduce the reported long stroke over the empty white field.
    for (let i=0;i<24;i++) { await page.mouse.move(90+i*2,150+i*15); await page.waitForTimeout(16); }
    const active = await page.locator('.hero-aperture').getAttribute('data-trail-state');
    if (reduced || touch || fallback) assert.notEqual(active,'active'); else assert.equal(active,'active');
    await page.screenshot({path:`artifacts/hero-contour-paper-${width}-${reduced}-${fallback}.png`});
    await page.locator('#hero').dispatchEvent('pointerleave'); await page.waitForTimeout(1300);
    if (!fallback) assert.equal(await page.locator('.hero-aperture').getAttribute('data-trail-state'),'idle');
    for (const progress of [.35,.55,.75,.9,.55,0]) {
      await page.evaluate(y=>scrollTo(0,y),height*(reduced?.7:1.8)*progress); await page.waitForTimeout(220);
      assert.equal((await grain()).opacity,'0.1'); assert.equal((await grain()).overflow,0);
    }
    if (width===1440) {
      // Freeze time in a separate instance of the actual shader so pixel changes
      // measure pointer displacement alone, independently of breathing/grain.
      const pixels = await page.evaluate(async () => {
        const { createApertureRenderer }=await import('/src/hero-aperture-renderer.js');
        const { createAperturePattern }=await import('/src/hero-aperture-pattern.js');
        const pattern=createAperturePattern();await pattern.ready;
        const c=document.createElement('canvas');c.width=800;c.height=600;
        const renderer=createApertureRenderer(c,pattern.canvas);renderer.prepare();
        const args={width:800,height:600,size:420,distance:1,progress:0,entry:1,reduced:false,time:1000,motionClock:0};
        const gl=c.getContext('webgl');
        const read=()=>{const data=new Uint8Array(800*600*4);gl.readPixels(0,0,800,600,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
        renderer.draw(args);const before=read();
        let edge=-1;
        for(let y=120;y<480&&edge<0;y++)for(let x=180;x<620;x++){const a=before[(y*800+x)*4+3];if(a>60&&a<195){edge=y*800+x;break;}}
        if(edge<0)throw Error('No contour found');
        const x=(edge%800)/800,y=1-Math.floor(edge/800)/600;
        for(let i=0;i<18;i++){const time=1020+i*16;renderer.pointer(x+.035,y,time);renderer.draw({...args,time});}
        const after=read();let changed=0,maxDifference=0,nonWhite=0,paperLeaks=0;
        for(let i=0;i<after.length;i+=4){const diff=Math.abs(after[i+3]-before[i+3]);if(diff>5)changed++;maxDifference=Math.max(maxDifference,diff);if(after[i]!==255||after[i+1]!==255||after[i+2]!==255)nonWhite++;}
        // A stroke far away from the pattern cannot stain or open the white paper.
        renderer.reset();renderer.pointer(.08,.3,2000);renderer.draw({...args,time:2000});
        const white=read();for(let row=0;row<600;row++)for(let col=0;col<100;col++){const i=(row*800+col)*4;if(white[i+3]!==255)paperLeaks++;}
        renderer.destroy();return {changed,maxDifference,nonWhite,paperLeaks};
      });
      assert.ok(pixels.changed>100,JSON.stringify(pixels));assert.ok(pixels.maxDifference>15);assert.equal(pixels.nonWhite,0);assert.equal(pixels.paperLeaks,0);
      results.push({pixels});
      await page.mouse.move(560,420);await page.mouse.move(600,460,{steps:12});await page.screenshot({path:'artifacts/hero-contour-edge.png'});
      await page.setViewportSize({width:820,height:1000});await page.waitForTimeout(350);assert.equal((await grain()).overflow,0);
    }
    results.push({width,height,reduced,touch,fallback,grain:first,active});console.log('PASS',width,{reduced,touch,fallback});await page.close();
  }
  assert.deepEqual(errors,[]);
} finally { await writeFile('artifacts/hero-contour-grain-qa.json',JSON.stringify({results,errors},null,2));await browser.close(); }
