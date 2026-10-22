import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch{
 sharp=require('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
}
const source='assets/source/clouds/cumulus-atlas-v1.png';
const metadata=await sharp(source).metadata();
if(!metadata.hasAlpha||metadata.width!==metadata.height)throw Error('Expected a square cloud atlas with transparency');
const side=Math.floor(metadata.width/2);await fs.mkdir('public/transition/clouds',{recursive:true});
for(let index=0;index<4;index++){
 const {data}=await sharp(source).extract({left:index%2*side,top:Math.floor(index/2)*side,width:side,height:side}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=side,y0=side,x1=-1,y1=-1;
 for(let y=0;y<side;y++)for(let x=0;x<side;x++)if(data[(y*side+x)*4+3]>10){
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
 }
 if(x1<0)throw Error(`Cloud ${index+1} is empty`);
 const output=await sharp(data,{raw:{width:side,height:side,channels:4}})
  .extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({width:512})
  .extend({top:8,bottom:8,left:8,right:8,background:{r:255,g:255,b:255,alpha:0}})
  .webp({quality:82,alphaQuality:90,effort:6}).toBuffer();
 await fs.writeFile(`public/transition/clouds/cumulus-${index+1}.webp`,output);
 console.log(`Cloud ${index+1}: ${output.length} bytes`);
}
