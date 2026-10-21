import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
const values=()=>page.locator('.footer-return-sticker').evaluate(el=>({
  x:parseFloat(el.style.getPropertyValue('--sticker-rub-x'))||0,
  y:parseFloat(el.style.getPropertyValue('--sticker-rub-y'))||0,
  turn:parseFloat(el.style.getPropertyValue('--sticker-rub-turn'))||0,
  pressure:parseFloat(el.style.getPropertyValue('--sticker-rub-pressure'))||0,
  rubbing:el.classList.contains('is-rubbing'),
  overflow:document.documentElement.scrollWidth-innerWidth,
}));
try {
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
  for(const [width,height]of (process.argv.includes('--handoff')?[]:[[1440,900],[820,1000],[390,844],[320,640]])){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(300);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await page.waitForTimeout(1000);
    const button=page.locator('.footer-return-sticker'),box=await button.boundingBox();
    assert.ok(box.width>=44);assert.ok((await values()).overflow<=1);
    if(width>600){
      const samples=[];
      for(let i=0;i<28;i++){
        await page.mouse.move(box.x+box.width*(i%2?.7:.3),box.y+box.height*(.25+(i%5)*.1),{steps:2});
        await page.waitForTimeout(24);samples.push(await values());
      }
      results.push({width,samples});
      assert.ok(samples.some(v=>v.pressure>.12),JSON.stringify(await button.evaluate(el=>({bounds:el.getBoundingClientRect().toJSON(),pointer:matchMedia('(hover: hover) and (pointer: fine)').matches,ready:window.isMainPageReady,hit:document.elementFromPoint(el.getBoundingClientRect().x+el.offsetWidth*.5,el.getBoundingClientRect().y+el.offsetHeight*.5)?.outerHTML.slice(0,150)}))));
      assert.ok(samples.some(v=>v.x>.1)&&samples.some(v=>v.x<-.1));
      assert.ok(samples.every(v=>Math.abs(v.x)<=3.21&&Math.abs(v.turn)<=1.31));
      if(width===1440)await page.screenshot({path:'artifacts/btt-rub-hover-1440.png',clip:{x:box.x-25,y:box.y-25,width:box.width+50,height:box.height+45}});
      await page.waitForTimeout(1000);
      assert.ok((await values()).pressure<.01,'motion settles even when the cursor stays on the sticker');
      await page.mouse.move(50,50);await page.waitForTimeout(400);
      assert.equal((await values()).rubbing,false);
      results.at(-1).settled=await values();
    }else results.push({width,layout:await values()});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
  const button=page.locator('.footer-return-sticker'),box=await button.boundingBox();
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3);
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6,{steps:5});
  assert.equal((await values()).pressure,0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(400);
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await button.hover();
  const freshBox=await button.boundingBox();
  await page.mouse.move(freshBox.x+freshBox.width*.3,freshBox.y+freshBox.height*.4,{steps:3});
  await button.click();
  await page.waitForFunction(()=>document.querySelector('.footer-return-peel').dataset.phase==='flying');
  assert.equal((await values()).rubbing,false);
  await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'),null,{timeout:18000});
  assert.equal(await page.evaluate(()=>document.querySelector('#main-content').inert),false);
  assert.deepEqual(errors,[]);
  console.log('PASS rubbing strokes, release and stationary decay at 1440/820, 390/320 layout, reduced motion and click-to-wind handoff');
}finally{await writeFile(`artifacts/btt-rub-hover-qa${process.argv.includes('--handoff')?'-handoff':''}.json`,JSON.stringify({results,errors},null,2));await browser.close();}
