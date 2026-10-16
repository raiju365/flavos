import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const blue = (r,g,b) => b > r*1.12 && b > g*1.12;
const rewrite = (line, keepNeutral) => {
  const eligible = (r,g,b) => blue(r,g,b) && (!keepNeutral || b-Math.max(r,g)>=12);
  return line.replace(/#[\da-f]{6}(?:[\da-f]{2})?\b/gi, hex => {
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    if (!eligible(r,g,b)||hex.toLowerCase()==='#20235b') return hex;
    return hex.length===9?`rgb(var(--brand-blue-rgb) / ${(parseInt(hex.slice(7),16)/255).toFixed(4)})`:'var(--folio-ink)';
  }).replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([.\d]+))?\s*\)/gi,(v,r,g,b,a)=>{
    if(!eligible(+r,+g,+b))return v;
    return a&&+a!==1?`rgb(var(--brand-blue-rgb) / ${a})`:'var(--folio-ink)';
  }).replace(/(?<![-\w])color:\s*rgb\(var\(--brand-blue-rgb\)\s*\/\s*[.\d]+\)/g,'color: var(--folio-ink)');
};
for(const file of ['src/editorial.css','src/portfolio.css','src/style.css']){
  const original=execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});
  let current=await readFile(file,'utf8'); let count=0;
  for(const line of original.split(/\r?\n/)){
    const previous=rewrite(line,false), corrected=rewrite(line,true);
    if(previous!==corrected&&current.includes(previous)) { current=current.replace(previous,corrected);count++; }
  }
  if(count)await writeFile(file,current);
  console.log('neutral lines restored',file,count);
}
