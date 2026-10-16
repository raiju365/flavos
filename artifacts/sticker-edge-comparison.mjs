import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const sharp = require('sharp');
const images = [];
for (const [index, path] of ['artifacts/sticker-conform-before/sticker-viewer-1440-sticker-4.png', 'artifacts/sticker-conform-4-front.png'].entries()) {
  const input = await sharp(path).extract({ left: 580, top: 175, width: 330, height: 90 }).resize(990, 270, { kernel: 'nearest' }).png().toBuffer();
  images.push({ input, left: 15, top: 50 + index * 330 });
}
const labels = Buffer.from('<svg width="1020" height="660"><g font-family="Arial" font-size="15" letter-spacing="2" fill="#202334"><text x="15" y="29">SEBELUM</text><text x="15" y="359">SEKARANG</text></g></svg>');
await sharp({ create: { width: 1020, height: 660, channels: 3, background: '#f4f1e9' } }).composite([...images, { input: labels, left: 0, top: 0 }]).png().toFile('artifacts/sticker-edge-comparison.png');
console.log('Saved pixel-preserving 3x edge comparison');
