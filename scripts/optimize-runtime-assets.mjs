import {createRequire} from 'node:module';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import {galleryWorks} from '../src/project-gallery-data.js';
const require=createRequire(import.meta.url);
let sharp;
try { sharp=require('sharp'); }
catch { sharp=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp'); }
const report=[];
async function convert(source,output,width,quality=85){
  await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});
  const info=await sharp(source).resize({width,withoutEnlargement:true}).webp({quality,alphaQuality:95,effort:5}).toFile(output);
  report.push({source,output,originalBytes:(await stat(source)).size,bytes:info.size,width:info.width,height:info.height});
}
// Originals remain available for editing. The browser uses these sized copies.
for(const id of [1,4,5,6,8,9,10,11,12,13]){
  for(const width of [512,960])await convert(`public/logoanimasi/web/logo${id}.webp`,`public/logoanimasi/optimized/logo${id}-${width}.webp`,width,85);
}
for(const [source,name,width,quality]of [
  ['public/Sidang Kekaisaran Romawi di Aula Marmer.png','hero-1448',1448,85],
  ['public/Sidang Kekaisaran Romawi di Aula Marmer.png','hero-960',960,82],
  ['public/borderfoto.png','portrait-frame',1024,88],
  ['public/fotosebelahabout/selfphoto.png','portrait',736,85],
  ['public/fotosebelahabout/backgroundorang/b1849338c1a01ba7de1daaed3df9da6c.jpg','portrait-background',640,80],
  ['public/untuk di lobby/wdadada.png','favicon',96,88],
])await convert(source,`public/optimized/${name}.webp`,width,quality);
for(const work of galleryWorks.filter(work=>work.src)){
  const file=work.src.split('/').pop();
  await convert(`public/karya/thumbs/${file}.webp`,`public/karya/preview/${file}.webp`,512,83);
}
await mkdir('artifacts/runtime-performance',{recursive:true});
await writeFile('artifacts/runtime-performance/asset-optimization.json',JSON.stringify(report,null,2));
for(const variant of [512,960]){
  const items=report.filter(item=>item.output.includes(`-${variant}.webp`)&&item.output.includes('/logoanimasi/'));
  console.log(`logos ${variant}: ${items.reduce((n,r)=>n+r.originalBytes,0)} -> ${items.reduce((n,r)=>n+r.bytes,0)} bytes`);
}
console.log('Saved runtime copies and asset-optimization.json');
