import {readFile,stat,writeFile} from 'node:fs/promises';
import {galleryWorks} from '../src/project-gallery-data.js';
import assert from 'node:assert/strict';
const report=JSON.parse(await readFile('artifacts/runtime-performance/build-assets.json','utf8'));
const variants=JSON.parse(await readFile('src/gallery-image-variants.json','utf8'));
for(const asset of report.assets){
  const file=await stat(`dist/${asset.name}`);assert.equal(file.size,asset.bytes);
  const url=`http://127.0.0.1:4173/${asset.name.split('/').map(encodeURIComponent).join('/')}`;
  const response=await fetch(url);
  assert.equal(response.status,200,asset.name);
  assert.ok(!response.headers.get('content-type')?.includes('text/html')||asset.name.endsWith('.html'),`Missing asset returned the SPA document: ${asset.name}`);
  await response.body?.cancel();
}
for(const work of galleryWorks.filter(work=>work.src)){
  const images=work.images||[{src:work.src}];
  await stat(`dist/karya/preview/${work.src.split('/').pop()}.webp`);
  for(const image of images)for(const width of [1280,1920])await stat(`dist${variants[image.src][width]}`);
}
await writeFile('artifacts/runtime-performance/asset-validation.json',JSON.stringify({assets:report.assets.length,works:galleryWorks.length,sourcePublicBytes:report.sourceBytes,runtimePublicBytes:report.runtimeBytes,pass:true},null,2));
console.log(`PASS ${report.assets.length} production assets, all artwork previews and both detail sizes`);
