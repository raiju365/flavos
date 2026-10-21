import { defineConfig } from 'vite';
import {runtimePublicAssets} from './scripts/runtime-public-assets.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

function sizedPublicAssets(){
  let config;
  return {
    name:'portfolio-runtime-assets',apply:'build',
    configResolved(value){config=value;},
    async writeBundle(){
      const report=runtimePublicAssets(config.root);
      for(const asset of report.assets){
        const target=path.resolve(config.root,config.build.outDir,asset.name);
        await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(asset.file,target);
      }
      const reports=path.join(config.root,'artifacts/runtime-performance');
      await fs.mkdir(reports,{recursive:true});
      await fs.writeFile(path.join(reports,'build-assets.json'),JSON.stringify({...report,assets:report.assets.map(({name,bytes})=>({name,bytes}))},null,2));
    },
  };
}

export default defineConfig({
  build:{copyPublicDir:false},
  plugins:[sizedPublicAssets()],
  server: {
    watch: {
      ignored: [
        '**/public/vtoi/**',
        '**/public/prframe/**',
        '**/public/prframe_old/**'
      ]
    }
  }
});
