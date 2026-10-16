import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const sharp=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  window.__THREE_DEVTOOLS__={dispatchEvent(event){
   const object=event.detail;
   if(!object?.isWebGLRenderer)return;
   const render=object.render.bind(object);
   object.render=function(scene,camera){
    if(scene.children.some(c=>c.isGroup)&&object.domElement.classList.contains('footer-signature-canvas'))window.lacquerStudy={renderer:object,scene,camera,model:scene.children.find(c=>c.isGroup)};
    return render(scene,camera);
   };
  }};
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,options,...rest){return original.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options,...rest);};
 });
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.isMainPageReady&&!document.querySelector('#loading-screen')&&window.lacquerStudy);
 await page.locator('#contact').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 const images=[],stats=[];
 for(const [i,[name,x,y]] of [['center',-.24,0],['left',-.576,-.386],['right',.108,.47]].entries()){
  const result=await page.evaluate(({x,y})=>{
   const {renderer,scene,camera,model}=lacquerStudy;
   model.rotation.set(x,y,0);model.position.set(0,0,0);
   const normal=model.position.clone().set(0,0,1).applyQuaternion(model.quaternion);
   const reflection=normal.clone().set(0,0,-1).reflect(normal);
   const direction=normal.clone().set(-2.5,4.5,8).normalize();
   scene.environmentRotation.setFromQuaternion(model.quaternion.clone().setFromUnitVectors(direction,reflection));
   renderer.render(scene,camera);
   return {png:renderer.domElement.toDataURL(),lights:scene.children.filter(c=>c.isLight).map(c=>c.type),materials:model.children[0].material.map(m=>({color:m.color.getHexString(),roughness:m.roughness,clearcoat:m.clearcoat,shaderKey:m.customProgramCacheKey()}))};
  },{x,y});
  const png=await sharp(Buffer.from(result.png.split(',')[1],'base64')).trim().resize({width:700,height:300,fit:'inside'}).png().toBuffer();
  await sharp({create:{width:720,height:330,channels:4,background:'#9d9da7'}}).composite([{input:png,gravity:'centre'}]).png().toFile(`artifacts/lacquer-light-${name}.png`);
  images.push({input:await sharp(`artifacts/lacquer-light-${name}.png`).toBuffer(),left:i*720,top:0});
  stats.push({name,lights:result.lights,materials:result.materials});
 }
 await sharp({create:{width:2160,height:330,channels:3,background:'#9d9da7'}}).composite(images).png().toFile('artifacts/lacquer-light-study.png');
 await writeFile('artifacts/lacquer-light-study.json',JSON.stringify(stats,null,2));
 console.log('Study rendered',JSON.stringify(stats));
}finally{await browser.close();}
