import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
try{for(const [width,height,touch,reduced] of [[1440,900,false,false],[820,1000,false,false],[390,844,true,false],[320,700,true,false],[1440,900,false,true]]){
const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:reduced?'reduce':'no-preference'});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'));await page.waitForTimeout(1800);
const state=()=>page.evaluate(()=>({enabled:document.querySelector('#hero').classList.contains('has-mouse-texture'),canvas:!!document.querySelector('.hero-grain-surface'),texture:document.querySelector('.hero-grain-surface')?.dataset.textureState,overflow:document.documentElement.scrollWidth-innerWidth,pixels:document.querySelectorAll('.is-pixel').length,underline:getComputedStyle(document.querySelector('.studio-link'),'::after').content}));
const initial=await state();assert.equal(initial.enabled,!touch&&!reduced);assert.equal(initial.overflow,0);assert.equal(initial.underline,'none');
if(!touch&&!reduced){
 await page.mouse.move(width*.3,height*.4);await page.mouse.move(width*.65,height*.5,{steps:14});
 await page.waitForFunction(()=>document.querySelector('.hero-grain-surface').dataset.textureState==='active');
 await page.screenshot({path:`artifacts/header-texture-${width}-active.png`});
 await page.waitForFunction(()=>document.querySelector('.hero-grain-surface').dataset.textureState==='idle');
 await page.evaluate(()=>{window.pixelSeen=false;new MutationObserver(()=>{if(document.querySelector('.is-pixel'))window.pixelSeen=true;}).observe(document.querySelector('.studio-header'),{subtree:true,attributes:true,attributeFilter:['class']});});
 await page.locator('.studio-link[href="#about"]').hover();await page.waitForFunction(()=>window.pixelSeen);
 await page.waitForTimeout(350);assert.equal((await state()).pixels,0);
 await page.locator('.studio-link[href="#about"]').focus();await page.keyboard.press('Enter');
}else await page.locator('.studio-link[href="#about"]').click();
await page.waitForFunction(()=>location.hash==='#about'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
assert.equal((await state()).pixels,0);
await page.locator('.studio-link[href="#projects"]').click();await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.studio-link[href="#hero"]').click();await page.waitForFunction(()=>location.hash==='#hero'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.waitForTimeout(800);
const final=await state();assert.equal(final.enabled,!touch&&!reduced);assert.equal(final.overflow,0);assert.equal(final.pixels,0);
await page.screenshot({path:`artifacts/header-texture-${width}-${reduced?'reduced':'idle'}.png`});
if(!touch&&!reduced){await page.evaluate(()=>document.querySelector('.hero-grain-surface').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForTimeout(100);assert.equal((await state()).enabled,false);}
results.push({width,touch,reduced,initial,final,navigation:true});console.log('PASS',width,touch,reduced);await page.close();
}assert.deepEqual(errors,[]);}finally{await writeFile('artifacts/header-texture-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
