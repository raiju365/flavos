import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const sharp = require('sharp');
const tiles = [];
for (let index = 0; index < 6; index++) {
  const file = index === 0 ? 'artifacts/sticker-viewer-1440-back.png' : `artifacts/sticker-viewer-1440-sticker-${index}-back.png`;
  tiles.push({ input: await sharp(file).resize(480, 300).toBuffer(), left: index % 3 * 480, top: Math.floor(index / 3) * 300 });
}
await sharp({ create: { width: 1440, height: 600, channels: 4, background: '#202334' } }).composite(tiles).png().toFile('artifacts/sticker-duplex-six-backs.png');
