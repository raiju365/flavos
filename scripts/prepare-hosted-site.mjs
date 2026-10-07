import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const destination=path.join(root,'sites/fahmi-portfolio');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
fs.mkdirSync(destination,{recursive:true});
for(const name of ['src','index.html','package.json','package-lock.json','vite.config.js','.gitignore','.openai'])fs.cpSync(path.join(root,name),path.join(destination,name),{recursive:true});
const source=[path.join(root,'index.html'),...walk(path.join(root,'src'))].filter(f=>/\.(html|js|css|json)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');
const included=[];
for(const file of walk(path.join(root,'public'))){
 const relative=path.relative(path.join(root,'public'),file).replaceAll('\\','/');
 const dynamic=relative.startsWith('logoanimasi/web/')||relative.startsWith('fotosebelahabout/frames/');
 if(!dynamic&&!source.includes(relative)&&!source.includes(encodeURI(relative))&&!source.includes(path.basename(file)))continue;
 if(/\.(bak|psd)$/i.test(file))continue;
 const target=path.join(destination,'public',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
 included.push({path:relative,bytes:fs.statSync(file).size});
}
fs.writeFileSync(path.join(root,'artifacts/deploy-assets.json'),JSON.stringify(included,null,2));
console.log(JSON.stringify({destination,assets:included.length,bytes:included.reduce((s,a)=>s+a.bytes,0),largest:included.toSorted((a,b)=>b.bytes-a.bytes).slice(0,5)},null,2));
