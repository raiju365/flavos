import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const onlyWidth=Number(process.argv[2]);
const results=[],errors=[];
let page;
const departure=()=>page.locator('.footer-editorial, .signature-bottom, .footer-back-to-top').evaluateAll(elements=>elements.map(el=>Object.fromEntries(['translate','scale','filter','willChange','transformOrigin'].map(key=>[key,el.style[key]]))));
const state=()=>page.evaluate(()=>{const overlay=document.querySelector('.colonnade-overlay'),grade=overlay.querySelector('.cloud-return-grade'),style=getComputedStyle(grade),hero=document.querySelector('#hero');return{y:scrollY,hash:location.hash,inert:document.querySelector('#main-content').inert,overflow:document.documentElement.style.overflow,busy:document.documentElement.classList.contains('is-colonnade-transitioning'),overlay:{...overlay.dataset},overlayVisible:getComputedStyle(overlay).visibility,grade:{opacity:style.opacity,display:style.display,backdropFilter:style.backdropFilter},mainFilter:getComputedStyle(document.querySelector('#main-content')).filter,footerFilter:getComputedStyle(document.querySelector('.signature-footer')).filter,hero:{...hero.dataset},focus:document.activeElement.id,overflowX:document.documentElement.scrollWidth-innerWidth};});
const footer=async()=>{await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(750);};
const click=async()=>{const box=await page.locator('.footer-back-to-top').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;assert.ok(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('.footer-back-to-top'),{x,y}));await page.mouse.click(x,y);};
const endpoint=async()=>{await page.waitForFunction(()=>location.hash==='#hero'&&scrollY<1&&!document.documentElement.classList.contains('is-colonnade-transitioning'),undefined,{timeout:18000});await page.waitForTimeout(100);const s=await state();assert.equal(s.inert,false);assert.equal(s.overflow,'');assert.equal(s.overlay.phase,'idle');assert.equal(s.overlay.cloudBeat,'idle');assert.equal(s.overlayVisible,'hidden');assert.equal(Number(s.overlay.cloudGrade),0);assert.equal(Number(s.overlay.cloudGradeVisible),0);assert.equal(s.grade.opacity,'0');assert.equal(s.grade.backdropFilter,'none');assert.equal(s.grade.display,'none');assert.equal(s.hero.returnScale,'1.0000');assert.equal(s.hero.returnReveal,'scale');assert.equal(s.hero.entryProgress,'0.0000');assert.equal(s.focus,'hero-heading');assert.ok(s.overflowX<=1);return s;};
try{
for(const [width,height,reduced] of [[1440,900,false],[390,844,false],[390,844,true],[820,1000,false],[320,640,false]]){
 if(onlyWidth&&width!==onlyWidth)continue;
 page=await browser.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});page.setDefaultTimeout(18000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),undefined,{timeout:60000});await footer();
 const baseline=await departure(),before=await state();
 await page.evaluate(()=>{window.tempoGradeSamples=[];window.tempoGradeSampling=true;const sample=()=>{if(!tempoGradeSampling)return;const overlay=document.querySelector('.colonnade-overlay'),grade=overlay.querySelector('.cloud-return-grade'),style=getComputedStyle(grade);if(overlay.classList.contains('is-active')){const data={time:performance.now(),y:scrollY,...overlay.dataset,scale:Number(document.querySelector('#hero').dataset.returnScale),opacity:Number(style.opacity),backdrop:style.backdropFilter};if(data.cloudOpaque==='true'&&!tempoGradeSamples.some(s=>s.whitePixel)){const c=overlay.querySelector('.cloud-return-canvas'),rgba=c.getContext('2d').getImageData(0,0,1,1).data;data.whitePixel=[...rgba];}tempoGradeSamples.push(data);}requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await click();
 const label=`${width}${reduced?'-reduced':''}`;
 if(!reduced&&(width===1440||width===390)){
   await page.waitForFunction(()=>{const o=document.querySelector('.colonnade-overlay');return o.dataset.cloudBeat==='flight'&&Number(o.dataset.cloudGradeVisible)>.8;});
   await page.screenshot({path:`artifacts/tempo-grade-${label}-flight.png`});
   await page.waitForFunction(()=>{const s=Number(document.querySelector('#hero').dataset.returnScale);return document.querySelector('.colonnade-overlay').dataset.phase==='reveal'&&s>.2&&s<.85;});
   await page.screenshot({path:`artifacts/tempo-grade-${label}-growth.png`});
 }
 const final=await endpoint();assert.deepEqual(await departure(),baseline);assert.equal(final.mainFilter,before.mainFilter);assert.equal(final.footerFilter,before.footerFilter);
 const samples=await page.evaluate(()=>{tempoGradeSampling=false;return tempoGradeSamples;});
 if(!reduced){
   const beats=[...new Set(samples.map(s=>s.cloudBeat))];for(const beat of ['anticipation','lift','flight','arrival','white','growth-in','growth','growth-settle','settle'])assert.ok(beats.includes(beat),`${label} missing beat ${beat}`);
   assert.ok(samples.some(s=>Number(s.cloudGradeVisible)>.9&&s.opacity>.4&&s.backdrop!=='none'),'visible flight grading reaches computed style');
   const opaque=samples.filter(s=>s.cloudOpaque==='true');assert.ok(opaque.length);assert.ok(opaque.every(s=>Number(s.cloudGradeVisible)===0&&s.opacity===0&&s.backdrop==='none'));
   assert.deepEqual(samples.find(s=>s.whitePixel)?.whitePixel,[255,255,255,255]);
   assert.ok(samples.some(s=>s.cloudPhase==='reveal'&&s.scale>.2&&s.scale<.8));
   const firstGrowth=samples.find(s=>s.cloudPhase==='reveal'&&s.scale<.05);
   if(firstGrowth)assert.ok(Number(firstGrowth.cloudGradeVisible)<.035,'warm growth grade enters continuously from zero after white');
   assert.ok(samples.filter(s=>s.phase==='cover').every(s=>Math.abs(s.y-before.y)<1));
 }
 if(width===390&&!reduced){
   await footer();await click();await page.waitForFunction(()=>document.querySelector('.colonnade-overlay').dataset.cloudBeat==='flight');await page.emulateMedia({reducedMotion:'reduce'});await endpoint();await page.emulateMedia({reducedMotion:'no-preference'});
 }
 if(reduced){
   await page.emulateMedia({reducedMotion:'no-preference'});await footer();await click();await page.waitForFunction(()=>document.querySelector('.colonnade-overlay').dataset.phase==='reveal');await page.mouse.move(width/2,height/2);await page.mouse.wheel(0,650);await page.keyboard.press('PageDown');await page.waitForTimeout(100);assert.equal((await state()).y,0);await endpoint();
 }
 await page.screenshot({path:`artifacts/tempo-grade-${label}-settled.png`});
 results.push({width,height,reduced,before,final,samples});console.log('PASS tempo beats, flight grade, neutral white, geometric growth and cleanup',label);
 await page.close();page=null;
}
assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:'artifacts/tempo-grade-failure.png'}).catch(()=>{});results.push({failure:error.message,state:await state().catch(()=>null),samples:await page.evaluate(()=>window.tempoGradeSamples).catch(()=>[])});}throw error;}
finally{await writeFile(`artifacts/tempo-grade-qa${onlyWidth?`-${onlyWidth}`:''}.json`,JSON.stringify({results,errors},null,2));await browser.close();}
