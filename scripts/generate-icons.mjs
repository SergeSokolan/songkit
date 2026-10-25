import fs from 'node:fs';
import zlib from 'node:zlib';
function crc(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    b = Buffer.alloc(data.length + 12);
  b.writeUInt32BE(data.length);
  t.copy(b, 4);
  data.copy(b, 8);
  b.writeUInt32BE(crc(Buffer.concat([t, data])), 8 + data.length);
  return b;
}
for (const size of [180, 192, 512]) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = [23, 25, 24];
      for (const [left, top, height] of [
        [92, 230, 148],
        [222, 134, 244],
        [352, 190, 188],
      ]) {
        const X = (x / size) * 512,
          Y = (y / size) * 512;
        if (X >= left && X < left + 68 && Y >= top && Y < top + height) color = [245, 166, 91];
      }
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
      raw[i + 3] = 255;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size);
  head.writeUInt32BE(size, 4);
  head[8] = 8;
  head[9] = 6;
  fs.writeFileSync(
    `public/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', head),
      chunk('IDAT', zlib.deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
