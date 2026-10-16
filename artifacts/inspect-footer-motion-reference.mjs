import {createRequire} from 'node:module';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const b=await chromium.launch({channel:'msedge',headless:true});
try {
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto('https://tympanus.net/Tutorials/MouseInstancing/',{waitUntil:'domcontentloaded',timeout:30000});
 await p.waitForTimeout(5000);
 console.log((await p.locator('body').innerText()).slice(0,2500));
 for(let i=0;i<3;i++){await p.mouse.move(300 + i * 280, 260 + i * 90); await p.waitForTimeout(600); await p.screenshot({path:`artifacts/footer-motion-reference-${i}.png`});await p.waitForTimeout(3000);}
}finally{await b.close();}

