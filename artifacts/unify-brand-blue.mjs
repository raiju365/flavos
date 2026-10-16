import { readFile, writeFile, readdir } from 'node:fs/promises';
const blue = (r, g, b) => b - Math.max(r, g) >= 12 && b > r * 1.12 && b > g * 1.12;
const files = (await readdir('src', { recursive: true })).filter(f => f.endsWith('.css')).map(f => `src/${f}`);
for (const file of files) {
  const source = await readFile(file, 'utf8');
  let changes = 0;
  let next = source.replace(/#[\da-f]{6}(?:[\da-f]{2})?\b/gi, hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    if (!blue(r, g, b) || hex.toLowerCase() === '#20235b') return hex;
    changes++;
    return hex.length === 9 ? `rgb(var(--brand-blue-rgb) / ${(parseInt(hex.slice(7), 16) / 255).toFixed(4)})` : 'var(--folio-ink)';
  });
  next = next.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([.\d]+))?\s*\)/gi, (value, r, g, b, alpha) => {
    if (!blue(+r, +g, +b)) return value;
    changes++;
    return alpha && +alpha !== 1 ? `rgb(var(--brand-blue-rgb) / ${alpha})` : 'var(--folio-ink)';
  });
  // Typography uses solid brand ink; transparent structural lines/shadows
  // keep their separate roles without introducing a second blue pigment.
  next = next.replace(/(?<![-\w])color:\s*rgb\(var\(--brand-blue-rgb\)\s*\/\s*[.\d]+\)/g, 'color: var(--folio-ink)');
  if (next !== source) { await writeFile(file, next); console.log(file, changes); }
}
