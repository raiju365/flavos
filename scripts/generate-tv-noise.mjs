import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Static, indexed PNG for reduced motion and browsers without canvas support.
// The animated version generates independent grain in src/tv-noise.js.
const size = 128;
const palette = Buffer.alloc(256 * 3);
const alpha = Buffer.alloc(256, 41);
for (let i = 0; i < 256; i++) palette.fill(i, i * 3, i * 3 + 3);
let seed = 19;
const pixels = Buffer.alloc((size + 1) * size);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    pixels[y * (size + 1) + x + 1] = ((seed >>> 24) + ((seed >>> 16) & 255)) >>> 1;
  }
}
function chunk(type, data) {
  const name = Buffer.from(type);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 3;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header), chunk('PLTE', palette), chunk('tRNS', alpha),
  chunk('IDAT', deflateSync(pixels, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../public/tv-noise.png', import.meta.url), png);
console.log(`TV noise: ${size} x ${size}, ${png.length} bytes`);
