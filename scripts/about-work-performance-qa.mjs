import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[];
for(const [width,height] of (['profile','trace'].includes(process.argv[2])?[[1440,900]]:[[1440,900],[820,1000],[390,844]])){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
 await page.evaluate(()=>scrollTo(0,scrollY+document.querySelector('#projects').getBoundingClientRect().top-innerHeight*5.1));
 await page.waitForTimeout(4200);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const before=(await cdp.send('Performance.getMetrics')).metrics;
 if(process.argv[2]==='profile'){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
 if(process.argv[2]==='trace')await cdp.send('Tracing.start',{categories:'devtools.timeline',transferMode:'ReturnAsStream'});
 await page.evaluate(()=>{
  window.qaFrames=[];window.qaLongTasks=[];window.qaRunning=true;
  window.qaObserver=new PerformanceObserver(list=>qaLongTasks.push(...list.getEntries().map(e=>e.duration)));qaObserver.observe({type:'longtask'});
  let last=performance.now();function sample(now){if(!qaRunning)return;qaFrames.push(now-last);last=now;requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 for(const direction of [1,-1]){
  if(process.argv[2]==='inpage')await page.evaluate(async ({direction,height})=>{for(let i=0;i<30;i++){window.dispatchEvent(new WheelEvent('wheel',{deltaY:direction*height*.18,bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,65));}},{direction,height});
  else for(let i=0;i<30;i++){await page.mouse.wheel(0,direction*height*.18);await page.waitForTimeout(65);}
  await page.waitForTimeout(500);
 }
 const after=(await cdp.send('Performance.getMetrics')).metrics;
 if(process.argv[2]==='trace'){
  const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');
  const {stream}=await completed;let data='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});data+=chunk.data;if(chunk.eof)break;}
  await cdp.send('IO.close',{handle:stream});await writeFile('artifacts/about-work-trace.json',data);
  console.log(JSON.parse(data).traceEvents.filter(e=>e.ph==='X'&&e.dur>50000).sort((a,b)=>b.dur-a.dur).slice(0,25).map(e=>({name:e.name,ms:e.dur/1000,args:e.args})));
 }
 if(process.argv[2]==='profile'){
  const {profile}=await cdp.send('Profiler.stop');
  await writeFile('artifacts/about-work.cpuprofile',JSON.stringify(profile));
  const counts=new Map();profile.samples.forEach((id,i)=>counts.set(id,(counts.get(id)||0)+(profile.timeDeltas[i]||0)));
  console.log(profile.nodes.map(n=>({name:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,ms:(counts.get(n.id)||0)/1000})).sort((a,b)=>b.ms-a.ms).slice(0,25));
 }
 const state=await page.evaluate(()=>{qaRunning=false;qaObserver.disconnect();const f=qaFrames.slice(1).sort((a,b)=>a-b);return {frames:f.length,p95:f[Math.floor(f.length*.95)],maxFrame:Math.max(...f),over34:f.filter(t=>t>34).length,longTasks:qaLongTasks,overflow:document.documentElement.scrollWidth-innerWidth,phase:document.querySelector('#projects').dataset.entryPhase,progress:document.querySelector('#projects').dataset.entryProgress,translate:document.querySelector('.about-reading-stage').style.translate};});
 const metrics=Object.fromEntries(['LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','ScriptDuration','TaskDuration'].map(name=>[name,after.find(m=>m.name===name).value-before.find(m=>m.name===name).value]));
 results.push({width,height,...state,metrics,errors});assert.equal(state.overflow,0);assert.deepEqual(errors,[]);
 await page.close();
}
await writeFile(`artifacts/about-work-performance-${process.argv[2]||'current'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
