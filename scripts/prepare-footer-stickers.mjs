import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { signatureStickers } from '../src/footer-signature-stickers.js';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp = require('sharp');
await mkdir('public/footer/stickers/web', { recursive: true });
for (const { file } of signatureStickers) {
  const output = `public/footer/stickers/web/${file.replace(/\.png$/i, '.webp')}`;
  await sharp(`public/footer/stickers/${file}`)
    .trim({ background: '#00000000', threshold: 1 })
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100 }).toFile(output);
  console.log(output);
}
