import {createRequire} from 'node:module';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {galleryWorks} from '../src/project-gallery-data.js';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const sharp=require('sharp');
await mkdir('public/karya/detail',{recursive:true});const variants={};let original=0,optimized=0;
for(const src of new Set(galleryWorks.flatMap(w=>w.images?.map(a=>a.src)||(w.src?[w.src]:[])))){
const meta=await sharp(`public${src}`).metadata();const entry={width:meta.width,height:meta.height};
for(const size of [1280,1920]){const url=`/karya/detail/${src.split('/').pop()}-${size}.webp`;await sharp(`public${src}`).rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:86,effort:5}).toFile(`public${url}`);entry[size]=url;if(size===1280)optimized+=(await stat(`public${url}`)).size;}
original+=(await stat(`public${src}`)).size;variants[src]=entry;
}
await writeFile('src/gallery-image-variants.json',JSON.stringify(variants,null,2)+'\n');console.log({original,optimized,reduction:1-optimized/original});
