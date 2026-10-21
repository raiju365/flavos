import fs from 'node:fs';
import path from 'node:path';
import {runtimePublicAssets} from './runtime-public-assets.mjs';
const root=path.resolve(import.meta.dirname,'..');
const destination=path.join(root,'sites/fahmi-portfolio');
fs.mkdirSync(destination,{recursive:true});
for(const name of ['src','index.html','package.json','package-lock.json','vite.config.js','scripts/runtime-public-assets.mjs','.gitignore','.openai'])fs.cpSync(path.join(root,name),path.join(destination,name),{recursive:true});
const included=[];
for(const {file,name:relative} of runtimePublicAssets(root).assets){
 if(/\.(bak|psd)$/i.test(file))continue;
 const target=path.join(destination,'public',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
 included.push({path:relative,bytes:fs.statSync(file).size});
}
fs.writeFileSync(path.join(root,'artifacts/deploy-assets.json'),JSON.stringify(included,null,2));
console.log(JSON.stringify({destination,assets:included.length,bytes:included.reduce((s,a)=>s+a.bytes,0),largest:included.toSorted((a,b)=>b.bytes-a.bytes).slice(0,5)},null,2));
