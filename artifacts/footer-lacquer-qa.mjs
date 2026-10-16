import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try{
 for(const [width,height,reduced] of [[1440,900,false],[820,1000,false],[390,844,false],[320,640,true]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|webgl/i.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{
   window.lacquerStartupViolations=[];
   window.__THREE_DEVTOOLS__={dispatchEvent(event){
    const object=event.detail;if(!object?.isWebGLRenderer)return;
    const render=object.render.bind(object);
    object.render=function(scene,camera){
     if(scene.children.some(c=>c.isGroup)&&object.domElement.classList.contains('footer-signature-canvas'))window.lacquerScene={renderer:object,scene,camera,model:scene.children.find(c=>c.isGroup)};
     return render(scene,camera);
    };
   }};
   const sample=()=>{if(document.querySelector('#loading-screen')?.dataset.phase==='opening'&&document.querySelector('.footer-signature')?.dataset.signatureReady!=='true')lacquerStartupViolations.push(performance.now());requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen')&&window.lacquerScene);
  assert.deepEqual(await page.evaluate(()=>lacquerStartupViolations),[]);
  assert.equal(await page.locator('.footer-signature').getAttribute('data-stickers-loaded'),'6');
  const inspect=()=>page.evaluate(()=>{
   const {scene,model,renderer}=lacquerScene,host=document.querySelector('.footer-signature'),gl=renderer.getContext();
   return {rotation:host.dataset.rotation,motion:host.dataset.motion.split(',').map(Number),light:host.dataset.light,
    lights:scene.children.filter(c=>c.isLight).map(c=>c.type),
    materials:model.children[0].material.map(m=>({color:m.color.getHexString(),roughness:m.roughness,coat:m.clearcoatRoughness,env:m.envMapIntensity})),
    stoneShader:renderer.info.programs.some(p=>/stoneNoise|stoneColor|float mineral|float vein/.test(gl.getShaderSource(p.fragmentShader)||'')),
    grain:getComputedStyle(document.querySelector('.tv-noise')).opacity};
  });
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.mouse.move(width*.5,height*.5);await page.waitForTimeout(1600);
  const calm=await inspect();assert.deepEqual(calm.lights,['HemisphereLight']);assert.equal(calm.stoneShader,false);assert.equal(calm.grain,'0.1');
  assert.ok(calm.materials.every(m=>parseInt(m.color.slice(0,2),16)<12));
  await page.screenshot({path:`artifacts/footer-lacquer-${width}-rest.png`});
  await page.mouse.move(width*.2,height*.2);await page.waitForTimeout(180);
  const moving=await inspect();
  await page.screenshot({path:`artifacts/footer-lacquer-${width}-turn.png`});
  if(reduced){assert.equal(moving.rotation,calm.rotation);assert.equal(moving.light,calm.light);assert.deepEqual(moving.motion,[0,0,0]);}
  else{
   assert.ok(moving.motion[2]>.04,'turn generates an inertial sheen response');
   assert.ok(moving.materials[0].coat<calm.materials[0].coat,'turn sharpens the reflection');
   assert.ok(moving.materials[0].env>calm.materials[0].env,'turn lifts the gloss gently');
   await page.waitForTimeout(1700);const settled=await inspect();
   assert.ok(settled.motion[2]<moving.motion[2]);assert.ok(settled.materials[0].coat>moving.materials[0].coat);
   await page.mouse.move(width*.85,height*.8);await page.waitForTimeout(180);const reverse=await inspect();
   assert.ok(reverse.motion[0]*moving.motion[0]<0,'bank reverses with the cursor');
   await page.screenshot({path:`artifacts/footer-lacquer-${width}-reverse.png`});
   await page.locator('.signature-footer').dispatchEvent('pointerleave');await page.waitForTimeout(1900);
   const released=await inspect();assert.ok(Math.abs(Number(released.rotation.split(',')[1]))<.04);assert.ok(released.motion[2]<.05);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.footer-direct').first().focus();assert.ok(await page.locator('.footer-direct').first().evaluate(el=>el===document.activeElement));
  await page.locator('.footer-back-to-top').click();await page.waitForFunction(()=>scrollY===0&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.waitForTimeout(200);const offscreen=await inspect();await page.waitForTimeout(300);assert.equal((await inspect()).light,offscreen.light);
  results.push({width,reduced,calm,moving,startupReady:true});console.log('PASS lacquer, lighting, sheen, wrapped stickers, grain and lifecycle',width);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
 assert.equal(await page.locator('.footer-signature').getAttribute('data-signature-ready'),'poster');
 assert.ok(await page.locator('.footer-signature > img').evaluate(el=>el.complete&&el.naturalWidth>0&&getComputedStyle(el).filter==='none'));
 await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/footer-lacquer-no-webgl.png'});await page.close();
 assert.deepEqual(errors,[]);console.log('PASS updated black lacquer poster fallback');
}finally{await writeFile('artifacts/footer-lacquer-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
