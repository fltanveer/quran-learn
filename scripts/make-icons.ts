// Generates PWA icons (crescent on green) as PNG without extra dependencies. Run once: npx tsx scripts/make-icons.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0f, 0x6b, 0x4f];
const FG = [0xfb, 0xf8, 0xf1];

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function icon(size: number) {
  const ss = 4; // supersampling for smooth edges
  const rows: Buffer[] = [];
  const outer = { x: 0.5, y: 0.5, r: 0.3 };
  const inner = { x: 0.6, y: 0.43, r: 0.25 };
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) / size;
          const py = (y + (sy + 0.5) / ss) / size;
          const inO = (px - outer.x) ** 2 + (py - outer.y) ** 2 < outer.r ** 2;
          const inI = (px - inner.x) ** 2 + (py - inner.y) ** 2 < inner.r ** 2;
          if (inO && !inI) cover++;
        }
      const t = cover / (ss * ss);
      for (let ch = 0; ch < 3; ch++) row[1 + x * 3 + ch] = Math.round(BG[ch] * (1 - t) + FG[ch] * t);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, icon(size));
writeFileSync('public/icons/apple-touch-icon.png', icon(180));
console.log('icons written');
