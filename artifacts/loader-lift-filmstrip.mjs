import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp = require('sharp');
const run = promisify(execFile);
const times = [4.3, 4.55, 4.8, 5.05, 5.3, 5.55];
const frames = [];
for (const [index, time] of times.entries()) {
  const file = `artifacts/loader-lift-video-frame-${index}.png`;
  await run('C:/Users/Fahmi Aufa/AppData/Local/ms-playwright/ffmpeg-1011/ffmpeg-win64.exe', ['-hide_banner','-loglevel','error','-y','-ss',String(time),'-i','artifacts/loader-lift-video/page@2268e641604c71e3e70b646314af3e00.webm','-frames:v','1','-c:v','png',file]);
  frames.push({ input: await sharp(file).resize(480,300).toBuffer(), left: index % 3 * 480, top: Math.floor(index / 3) * 300 });
}
await sharp({ create: { width: 1440, height: 600, channels: 3, background: '#fff' } }).composite(frames).png().toFile('artifacts/loader-lift-filmstrip.png');
console.log('Filmstrip saved: artifacts/loader-lift-filmstrip.png');
