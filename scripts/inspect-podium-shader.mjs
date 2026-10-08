import {writeFile,mkdir} from 'node:fs/promises';
const html=await(await fetch('https://podium.global/')).text();const urls=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>new URL(m[1],'https://podium.global/').href);await mkdir('artifacts/podium-source',{recursive:true});
for(const [i,url] of urls.entries()){const code=await(await fetch(url)).text();if(/useTrailTexture|uProgress|fragmentShader|gl_FragColor/.test(code)){await writeFile(`artifacts/podium-source/chunk-${i}.js`,code);console.log(i,url,code.length,[...new Set(code.match(/u[A-Z][a-zA-Z0-9]+/g))].slice(0,70).join(','));}}
