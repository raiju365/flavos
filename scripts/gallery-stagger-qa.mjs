import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const results=[],errors=[];
try {
 for(const [width,height] of [[330,715],[390,844],[820,1000],[1440,900]]){
  if(process.argv[2]&&width!==Number(process.argv[2]))continue;
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.isMainPageReady&&document.body.style.overflow!=='hidden');
  const seek=async p=>{
   await page.evaluate(p=>{
    const work=document.querySelector('#projects'),stage=document.querySelector('.about-reading-stage');
    const end=Math.max(innerHeight,stage.offsetHeight+parseFloat(stage.style.getPropertyValue('--gallery-stage-top')||0));
    scrollTo({top:scrollY+work.getBoundingClientRect().top-end-innerHeight*4*(1-p),behavior:'instant'});
   },p);await page.waitForTimeout(350);
  };
  await seek(.1);await page.waitForTimeout(4000);
  const states=[];
  for(const p of [.025,.075,.175,.325,.5,.7,.9,1,.7,.325,.075,0,...Array.from({length:35},(_,i)=>.1+i*.025)]){
   await seek(p);
   const state=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.orbit-card')];
    return {p:+document.querySelector('#projects').dataset.entryProgress,
     cards:cards.map(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el),m=new DOMMatrix(style.transform);return {arrival:+el.dataset.arrival,visible:style.visibility!=='hidden',size:el.offsetWidth,x:r.x,y:r.y,w:r.width,h:r.height,worldY:m.m42,matrix:[...m.toFloat64Array()]};}),
     foreground:+getComputedStyle(document.querySelector('.about-reading-stage')).zIndex,
     background:+getComputedStyle(document.querySelector('.orbit-overview')).zIndex,
     overflow:document.documentElement.scrollWidth-innerWidth};
   });
   states.push(state);assert.equal(state.overflow,0);
   if(p>0&&p<1)assert.ok(state.foreground>state.background);
   if(p<.45)assert.ok(state.cards.some(card=>!card.visible));
   if(p===1)assert.ok(state.cards.every(card=>card.arrival===1));
   if([.175,.325,.5,.7,1].includes(p))await page.screenshot({path:`artifacts/gallery-stagger-${width}-${p}.png`});
  }
  const counts=states.slice(0,4).map(s=>s.cards.filter(c=>c.visible).length);
  assert.deepEqual(counts,[1,2,4,7]);
  assert.ok(states[2].cards[0].worldY>states[0].cards[0].worldY+40,'first work drops from the frame');
  for(let i=0;i<states[3].cards.length;i++)assert.ok(Math.abs(states[3].cards[i].arrival-states[9].cards[i].arrival)<.003,'reverse restores departure order');
  assert.ok(states[11].cards.every(card=>!card.visible));
  results.push({width,counts,states});console.log('PASS stagger',width,counts);
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile('artifacts/gallery-stagger-qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
