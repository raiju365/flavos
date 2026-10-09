import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],results=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const sample=()=>page.locator('#hero').evaluate(el=>{
    const c=el.querySelector('.hero-aperture');c.dispatchEvent(new Event('aperture-restored'));
    const gl=c.getContext('webgl'),pixels=new Uint8Array(c.width*c.height*4);
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const alpha=[];for(let y=0;y<c.height;y+=12)for(let x=0;x<c.width;x+=12)alpha.push(pixels[(y*c.width+x)*4+3]);
    return {seed:el.dataset.apertureSeed,alpha,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  const variants=[];
  for(let visit=0;visit<3;visit++){
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});
    await page.waitForTimeout(1300);variants.push(await sample());
    await page.screenshot({path:`artifacts/hero-random-${visit}.png`});
  }
  assert.equal(new Set(variants.map(v=>v.seed)).size,3);
  for(let i=1;i<variants.length;i++){
    const difference=variants[0].alpha.filter((v,j)=>Math.abs(v-variants[i].alpha[j])>40).length;
    assert.ok(difference>100,`distinct outlines: ${difference}`);results.push({visit:i,difference});
  }
  const before=variants.at(-1).seed;
  for(const progress of [.1,.28,.45,.58,.9,.45,0]){
    await page.evaluate(p=>scrollTo(0,p*900*1.8),progress);await page.waitForTimeout(500);
    await page.screenshot({path:`artifacts/hero-random-pull-${progress}.png`});
    assert.equal((await sample()).overflow,0);
  }
  await page.waitForTimeout(1100);const returned=await sample();
  assert.notEqual(returned.seed,before);await page.screenshot({path:'artifacts/hero-random-return.png'});
  // No seed reset on resize or a small scroll around the start.
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
  assert.equal((await sample()).seed,returned.seed);
  await page.screenshot({path:'artifacts/hero-random-mobile.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1100);
  const a=await sample();await page.waitForTimeout(500);const b=await sample();
  assert.deepEqual(a.alpha,b.alpha);assert.equal(a.overflow,0);
  assert.deepEqual(errors,[]);results.push({seeds:variants.map(v=>v.seed),returnedSeed:returned.seed,errors});
  console.log(JSON.stringify(results,null,2));
}finally{await writeFile('artifacts/hero-random-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
