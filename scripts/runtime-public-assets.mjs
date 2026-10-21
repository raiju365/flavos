import fs from 'node:fs';
import path from 'node:path';

// Keep editable originals in public/ for development. Production carries the
// sized runtime copies; new assets without a replacement remain included.
export function runtimePublicAssets(root){
  const publicRoot=path.join(root,'public');
  const variants=JSON.parse(fs.readFileSync(path.join(root,'src/gallery-image-variants.json'),'utf8'));
  const replaced=new Set(Object.entries(variants).filter(([,entry])=>fs.existsSync(path.join(publicRoot,entry[1920].slice(1))))
    .map(([source])=>source.slice(1)));
  const pairs=[
    ['Sidang Kekaisaran Romawi di Aula Marmer.png','optimized/hero-1448.webp'],
    ['borderfoto.png','optimized/portrait-frame.webp'],
    ['fotosebelahabout/selfphoto.png','optimized/portrait.webp'],
    ['fotosebelahabout/backgroundorang/b1849338c1a01ba7de1daaed3df9da6c.jpg','optimized/portrait-background.webp'],
    ['untuk di lobby/wdadada.png','optimized/favicon.webp'],
    ['footer/stickers/STIKERBTTFOOTER.png','footer/stiker-btt-footer.webp'],
  ];
  for(const [source,replacement]of pairs)if(fs.existsSync(path.join(publicRoot,replacement)))replaced.add(source);
  const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
  const files=walk(publicRoot),assets=[];
  for(const file of files){
    const name=path.relative(publicRoot,file).replaceAll('\\','/');
    let replacement;
    const logo=name.match(/^logoanimasi\/web\/logo(\d+)\.webp$/);
    if(logo)replacement=`logoanimasi/optimized/logo${logo[1]}-960.webp`;
    if(name.startsWith('karya/thumbs/'))replacement=name.replace('karya/thumbs/','karya/preview/');
    if(/^footer\/stickers\/[^/]+\.png$/i.test(name))replacement=name.replace('footer/stickers/','footer/stickers/web/').replace(/\.png$/i,'.webp');
    const hasReplacement=replacement&&fs.existsSync(path.join(publicRoot,replacement));
    if(replaced.has(name)||hasReplacement)continue;
    assets.push({name,file,bytes:fs.statSync(file).size});
  }
  return {assets,sourceBytes:files.reduce((n,file)=>n+fs.statSync(file).size,0),runtimeBytes:assets.reduce((n,file)=>n+file.bytes,0)};
}
