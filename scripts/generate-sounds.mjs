import fs from 'node:fs';
// Original, deterministic synthesized one-shots. No third-party sample material.
const rate = 22050;
let seed = 736;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
function wav(name, duration, fn) {
  const count = Math.floor(rate * duration),
    b = Buffer.alloc(44 + count * 2);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const fade = Math.min(1, (count - i) / 200);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, fn(t))) * fade * 30000), 44 + i * 2);
  }
  fs.writeFileSync(`public/sounds/${name}.wav`, b);
}
wav(
  'kick',
  0.42,
  (t) =>
    Math.sin(2 * Math.PI * (48 * t + 9 * (1 - Math.exp(-t * 35)))) * Math.exp(-t * 13) * 0.85 +
    noise() * Math.exp(-t * 180) * 0.08,
);
wav(
  'snare',
  0.23,
  (t) =>
    (noise() * 0.7 + Math.sin(2 * Math.PI * 185 * t) * 0.3) *
    Math.exp(-t * 23) *
    Math.min(1, t * 2000),
);
let previous = 0;
wav('hat', 0.11, (t) => {
  const n = noise();
  const high = n - previous;
  previous = n;
  return high * 0.3 * Math.exp(-t * 55) * Math.min(1, t * 3000);
});
for (const [name, frequency, decay] of [
  ['tom1', 185, 9],
  ['tom2', 142, 8],
  ['tom3', 104, 7],
]) {
  wav(
    name,
    0.65,
    (t) =>
      (Math.sin(2 * Math.PI * (frequency * t + 1.8 * (1 - Math.exp(-t * 28)))) * 0.72 +
        Math.sin(2 * Math.PI * frequency * 1.57 * t) * 0.13 +
        noise() * Math.exp(-t * 90) * 0.15) *
      Math.exp(-t * decay) *
      Math.min(1, t * 1800),
  );
}
function cymbal(name, duration, base, decay, noiseMix) {
  let prior = 0;
  wav(name, duration, (t) => {
    const n = noise(),
      high = n - prior;
    prior = n;
    const metal =
      [1, 1.342, 1.731, 2.117, 2.703].reduce(
        (sum, ratio) => sum + Math.sin(2 * Math.PI * base * ratio * t),
        0,
      ) / 5;
    return (
      (metal * (1 - noiseMix) + high * noiseMix * 0.6) *
      Math.exp(-t * decay) *
      Math.min(1, t * 1800)
    );
  });
}
cymbal('ride', 1.3, 2093, 5, 0.32);
cymbal('crash1', 1.8, 1567, 3.8, 0.75);
cymbal('crash2', 2.2, 1244, 3.2, 0.8);
