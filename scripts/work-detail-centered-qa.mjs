import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const errors=[];
try{for(const [width,height] of [[1792,948],[1440,900],[820,1000],[390,844],[320,640]]){
if(process.argv[2] && width!==1440)continue;
const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
await page.locator('.studio-link[href="#projects"]').click();
await page.waitForFunction(()=>location.hash==='#projects'&&!document.documentElement.classList.contains('is-colonnade-transitioning'));
await page.locator('.orbit-card[data-index="0"]').focus();await page.keyboard.press('Home');for(let i=0;i<(process.argv[2]?5:1);i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.press('Enter');
await page.waitForFunction(()=>document.querySelector('#project-gallery').dataset.scenePhase==='idle'&&document.querySelector('#project-gallery').open);
const state=await page.locator('.orbit-detail-media img').first().evaluate(el=>{const r=el.getBoundingClientRect(),d=document.querySelector('.orbit-detail');return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,ratio:el.naturalWidth/el.naturalHeight,overflow:d.scrollWidth-d.clientWidth};});
assert.ok(Math.abs(state.x-width/2)<1,JSON.stringify(state));if(width>760)assert.ok(Math.abs(state.y-height/2)<1,JSON.stringify(state));assert.equal(state.overflow,0);assert.ok(Math.abs(state.w/state.h-state.ratio)<.001);
await page.screenshot({path:`artifacts/work-detail-centered-${width}${process.argv[2]?"-multi":""}.png`});
await page.locator('.orbit-detail-next').click();await page.waitForFunction(()=>document.querySelector('#project-gallery').dataset.scenePhase==='idle');
await page.locator('.orbit-close').click();await page.waitForFunction(()=>!document.querySelector('#project-gallery').open);
console.log('PASS',width,state);await page.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}

