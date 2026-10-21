import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const label=process.argv[2]||'after',url=process.env.QA_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const reports=[];
await mkdir('artifacts/runtime-performance',{recursive:true});
const frameSample=page=>page.evaluate(()=>new Promise(resolve=>{
  const times=[];let last=performance.now(),start=last;
  const tick=now=>{times.push(now-last);last=now;if(now-start<2200)requestAnimationFrame(tick);else{
    const sorted=[...times].sort((a,b)=>a-b);resolve({frames:times.length,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:sorted[Math.floor(sorted.length*.95)],over33:times.filter(t=>t>33.4).length});
  }};requestAnimationFrame(tick);
}));
try{
 for(const [width,height,cpu]of [[1440,900,1],[390,844,4]]){
  if(process.argv[3]&&width!==Number(process.argv[3]))continue;
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:width===390?2:1,hasTouch:width===390,isMobile:width===390});
  page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(cpu>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await page.addInitScript(()=>{
    window.qaLongTasks=[];new PerformanceObserver(list=>window.qaLongTasks.push(...list.getEntries().map(e=>({at:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
    window.qaRestoreFrames=[];
    const tick=()=>{const loader=document.querySelector('#loading-screen');
      if(loader||!window.qaRevealedAt||performance.now()-window.qaRevealedAt<800){
        if(!loader&&!window.qaRevealedAt)window.qaRevealedAt=performance.now();
        window.qaRestoreFrames.push({t:performance.now(),y:scrollY,height:document.documentElement.scrollHeight,loader:Boolean(loader),phase:loader?.dataset.phase,opening:loader?.dataset.revealProgress,color:loader?getComputedStyle(loader).backgroundColor:null,footerTop:document.querySelector('.signature-footer')?.getBoundingClientRect().top});requestAnimationFrame(tick);
      }};requestAnimationFrame(tick);
  });
  const began=Date.now();await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  const readyMs=Date.now()-began,heroFrames=await frameSample(page);
  const initial=await page.evaluate(()=>({resources:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,bytes:e.encodedBodySize})),longTasks:window.qaLongTasks,images:[...document.images].filter(i=>i.complete&&i.naturalWidth).length}));
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>['true','poster'].includes(document.querySelector('.footer-signature').dataset.signatureReady),null,{timeout:90000});
  await page.waitForTimeout(600);const footerFrames=await frameSample(page);
  await page.waitForTimeout(250);const saved=await page.evaluate(()=>({y:scrollY,state:history.state,height:document.documentElement.scrollHeight}));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:90000});
  await page.waitForTimeout(900);
  const restored=await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,frames:window.qaRestoreFrames,overflow:document.documentElement.scrollWidth-innerWidth,bodyLock:document.body.style.overflow,rootLock:document.documentElement.style.overflow,signature:{...document.querySelector('.footer-signature').dataset}}));
  await page.screenshot({path:`artifacts/runtime-performance/${label}-${width}-restored.png`});
  const exposed=restored.frames.filter(f=>!f.loader||(f.phase==='opening'&&Number(f.opening)>.025));
  const report={width,height,cpu,readyMs,initialBytes:initial.resources.reduce((n,r)=>n+r.bytes,0),initial,heroFrames,footerFrames,saved,restored,exposedYRange:exposed.length?Math.max(...exposed.map(f=>f.y))-Math.min(...exposed.map(f=>f.y)):null,errors};
  reports.push(report);console.log(JSON.stringify({label,width,cpu,readyMs,initialBytes:report.initialBytes,heroFrames,footerFrames,savedY:saved.y,restoredY:restored.y,exposedYRange:report.exposedYRange,errors}));
  await page.close();
 }
}finally{await writeFile(`artifacts/runtime-performance/${label}${process.argv[3]?'-'+process.argv[3]:''}.json`,JSON.stringify(reports,null,2));await browser.close();}
