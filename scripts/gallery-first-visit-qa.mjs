import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[];
try {
  for(const [width,height] of [[330,715],[390,844],[820,1000],[1440,900]]) {
    if(process.argv[2]&&process.argv[2]!=='remaining'&&width!==Number(process.argv[2]))continue;
    if(process.argv[2]==='remaining'&&width===330)continue;
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<700});
    const page=await context.newPage(),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
    await page.mouse.move(2,height-2);
    await page.evaluate(()=>{
      window.firstVisit={frames:[],longTasks:[],samples:[],overlaps:[],running:true};
      window.firstVisitObserver=new PerformanceObserver(list=>firstVisit.longTasks.push(...list.getEntries().map(e=>e.duration)));
      firstVisitObserver.observe({type:'longtask'});
      let last=performance.now(),frame=0;
      const sample=now=>{
        if(!firstVisit.running)return;
        // Screenshot capture can pause headless painting; exclude that tool
        // overhead from the animation's frame-time measurement.
        if(firstVisit.capturing||firstVisit.resetTime){last=now;firstVisit.resetTime=false;requestAnimationFrame(sample);return;}
        firstVisit.frames.push(now-last);last=now;
        const p=+document.querySelector('#projects').dataset.entryProgress;
        if(++frame%8===0&&p>0&&p<1){
          const photo=document.querySelector('.portrait-orbit').getBoundingClientRect();
          const cards=[...document.querySelectorAll('.orbit-card')].filter(el=>el.style.visibility!=='hidden').map(el=>el.getBoundingClientRect());
          const stage=document.querySelector('.orbit-stage');
          const arrivals=[...document.querySelectorAll('.orbit-card')].map(el=>+el.dataset.arrival);
          const firstY=new DOMMatrix(getComputedStyle(document.querySelector('.orbit-card')).transform).m42;
          const foreground=+getComputedStyle(document.querySelector('.about-reading-stage')).zIndex;
          const background=+getComputedStyle(document.querySelector('.orbit-overview')).zIndex;
          if(background>=foreground)firstVisit.overlaps.push({p,foreground,background});
          firstVisit.samples.push({p,y:scrollY,photoBottom:photo.bottom,arrivals,firstY});
        }
        requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    });
    let captured=false,emerging=false;
    for(let i=0;i<280;i++){
      await page.mouse.wheel(0,height*.17);
      await page.waitForTimeout(55);
      const p=await page.locator('#projects').getAttribute('data-entry-progress');
      if(!emerging&&+p>.32){
        await page.evaluate(()=>{firstVisit.capturing=true;});
        await page.screenshot({path:`artifacts/gallery-first-visit-${width}-behind-frame.png`});
        await page.evaluate(()=>{firstVisit.capturing=false;firstVisit.resetTime=true;});
        emerging=true;
      }
      if(!captured&&+p>.8){
        await page.evaluate(()=>{firstVisit.capturing=true;});
        await page.screenshot({path:`artifacts/gallery-first-visit-${width}-entry.png`});
        await page.evaluate(()=>{firstVisit.capturing=false;firstVisit.resetTime=true;});
        captured=true;
      }
      if(+p>=1)break;
    }
    await page.waitForTimeout(400);
    const result=await page.evaluate(()=>{
      firstVisit.running=false;firstVisitObserver.disconnect();
      const f=firstVisit.frames.slice(2).sort((a,b)=>a-b);
      const resources=performance.getEntriesByType('resource').filter(r=>r.name.includes('/karya/'));
      return {width:innerWidth,progress:+document.querySelector('#projects').dataset.entryProgress,phase:document.querySelector('#projects').dataset.entryPhase,p95:f[Math.floor(f.length*.95)],maxFrame:Math.max(...f),frames:f.length,over50:f.filter(t=>t>50).length,longTasks:firstVisit.longTasks,overlaps:firstVisit.overlaps,samples:firstVisit.samples,overflow:document.documentElement.scrollWidth-innerWidth,resources:resources.map(r=>({url:r.name.split('/karya/')[1],bytes:r.decodedBodySize})),images:[...document.querySelectorAll('.orbit-card img')].map(el=>({loaded:el.complete&&el.naturalWidth>0,src:el.currentSrc}))};
    });
    assert.equal(result.progress,1,JSON.stringify({progress:result.progress,samples:result.samples.slice(-3),longTasks:result.longTasks}));assert.equal(result.phase,'idle');assert.equal(result.overflow,0);
    assert.deepEqual(result.overlaps,[],'departing works stay behind the portrait layer');assert.ok(result.samples.length>5);
    const early=result.samples.find(s=>s.p>.05&&s.p<.12),lower=result.samples.find(s=>s.p>.18&&s.p<.3);
    assert.ok(early&&lower,'capture the real downward emergence');
    assert.ok(lower.firstY>early.firstY+height*.06,'works descend from their portrait origin');
    assert.ok(early.arrivals.filter(p=>p>0).length<lower.arrivals.filter(p=>p>0).length,'new works depart one at a time');
    assert.ok(result.images.every(img=>img.loaded&&img.src.includes('/thumbs/')));
    assert.ok(result.resources.every(r=>r.url.startsWith('thumbs/')),'first visit must not upload full-resolution textures');
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    await page.screenshot({path:`artifacts/gallery-first-visit-${width}-settled.png`});
    // Reverse through the same handoff on the same cold-load session.
    for(let i=0;i<100;i++){
      await page.mouse.wheel(0,-height*.18);await page.waitForTimeout(55);
      if(+(await page.locator('#projects').getAttribute('data-entry-progress'))===0)break;
    }
    assert.equal(await page.locator('#projects').getAttribute('data-entry-progress'),'0.0000');
    results.push({...result,errors,failed,reverse:true});
    console.log('PASS cold visit',width,JSON.stringify({p95:result.p95,max:result.maxFrame,longTasks:result.longTasks.length,samples:result.samples.length,overlaps:result.overlaps.length,bytes:result.resources.reduce((sum,r)=>sum+r.bytes,0)}));
    await context.close();
  }
} finally {
  await writeFile('artifacts/gallery-first-visit-qa.json',JSON.stringify(results,null,2));
  await browser.close();
}
