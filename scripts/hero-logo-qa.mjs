import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const b=await chromium.launch({channel:'msedge',headless:true});
const errors=[],results=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});
 p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen'),null,{timeout:60000});await p.waitForTimeout(1200);
 const sample=()=>p.evaluate(()=>{
   const c=document.querySelector('.hero-aperture');c.dispatchEvent(new Event('aperture-restored'));
   const gl=c.getContext('webgl'),px=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
   const alpha=[];for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8)alpha.push(px[(y*c.width+x)*4+3]);return alpha;
 });
 const first=await sample();await p.waitForTimeout(1500);const second=await sample();
 const changed=first.filter((v,i)=>Math.abs(v-second[i])>8).length;assert.ok(changed>30,`moving logo edges: ${changed}`);
 for(const [w,h] of [[1440,900],[820,1000],[390,844],[320,700]]){
   await p.setViewportSize({width:w,height:h});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(450);
   for(const progress of [0,.4,.9,0]){
     await p.evaluate(([h,s])=>scrollTo(0,h*1.8*s),[h,progress]);await p.waitForTimeout(350);
     const state=await p.evaluate(()=>({nav:getComputedStyle(document.querySelector('.studio-header')).visibility,overflow:document.documentElement.scrollWidth-innerWidth,progress:document.querySelector('#hero').dataset.entryProgress}));
     assert.equal(state.nav,progress<.86?'hidden':'visible');assert.equal(state.overflow,0);results.push({w,progress,...state});
     if(progress===0||w===1440)await p.screenshot({path:`artifacts/hero-logo-${w}-${progress}.png`});
   }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({changed,checks:results.length,errors}));
}finally{await writeFile('artifacts/hero-logo-qa.json',JSON.stringify({results,errors},null,2));await b.close();}
