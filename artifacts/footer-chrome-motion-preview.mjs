import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},recordVideo:{dir:'artifacts/footer-chrome-video',size:{width:960,height:600}}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|webgl/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{window.__THREE_DEVTOOLS__={dispatchEvent(event){const renderer=event.detail;if(!renderer?.isWebGLRenderer)return;const render=renderer.render.bind(renderer);renderer.render=function(scene,camera){if(scene.children.some(c=>c.isGroup)&&renderer.domElement.classList.contains('footer-signature-canvas'))window.chromeMotion={renderer,scene,model:scene.children.find(c=>c.isGroup)};return render(scene,camera);};}};});
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen')&&window.chromeMotion);
 await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 const sample=()=>page.evaluate(()=>({clock:chromeMotion.renderer.properties.get(chromeMotion.model.children[0].material[0]).uniforms.chromeClock.value,glints:chromeMotion.model.children.filter(c=>c.isSprite).map(c=>c.material.opacity),rotation:document.querySelector('.footer-signature').dataset.rotation,light:document.querySelector('.footer-signature').dataset.light}));
 await page.mouse.move(640,400);await page.waitForTimeout(1000);const first=await sample();
 await page.mouse.move(330,290,{steps:20});await page.waitForTimeout(1100);
 await page.mouse.move(950,510,{steps:35});await page.waitForTimeout(1200);
 await page.mouse.move(500,460,{steps:30});await page.waitForTimeout(1200);
 await page.locator('.signature-footer').dispatchEvent('pointerleave');await page.waitForTimeout(2600);
 const last=await sample();assert.ok(last.clock>first.clock+1);assert.notDeepEqual(first.glints,last.glints,'glints have a changing, staggered pulse');
 const video=page.video();await page.close();await video.saveAs('artifacts/footer-chrome-motion-raw.webm');
 assert.deepEqual(errors,[]);
 const reduced=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 await reduced.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});await reduced.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));
 await reduced.locator('#contact').scrollIntoViewIfNeeded();await reduced.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await reduced.waitForTimeout(300);
 const before=await reduced.locator('.footer-signature').getAttribute('data-light');await reduced.mouse.move(1100,650);await reduced.waitForTimeout(300);assert.equal(await reduced.locator('.footer-signature').getAttribute('data-light'),before);await reduced.close();
 await writeFile('artifacts/footer-chrome-motion-qa.json',JSON.stringify({first,last,errors,reducedStatic:true},null,2));
 console.log('PASS liquid reflection clock, staggered star glints, motion preview, reduced motion',JSON.stringify({first,last}));
}finally{await browser.close();}
