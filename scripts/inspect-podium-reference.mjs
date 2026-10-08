import {createRequire} from 'node:module';
const require=createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');const {chromium}=require('playwright');
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('https://podium.global/',{waitUntil:'domcontentloaded'});for(let i=0;i<18;i++){await p.waitForTimeout(1000);await p.screenshot({path:`artifacts/podium-reference-${i}.png`});} console.log(await p.locator('svg').evaluateAll(es=>es.slice(0,4).map(e=>e.outerHTML.slice(0,800))));await b.close();

