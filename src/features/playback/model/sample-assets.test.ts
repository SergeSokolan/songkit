// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { INSTRUMENTS } from '../../../entities/drum-pattern';
describe('packaged drum samples', () => {
  it('ships three distinct, nonempty PCM layers for every selectable instrument', () => {
    const hashes = new Set<string>();
    for (const instrument of INSTRUMENTS) {
      for (const layer of ['soft', 'medium', 'hard']) {
        const bytes = readFileSync(`public/sounds/muldjord/${instrument}-${layer}.wav`);
        expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
        expect(bytes.subarray(8, 12).toString()).toBe('WAVE');
        expect(bytes.readUInt16LE(20)).toBe(1);
        expect(bytes.readUInt16LE(22)).toBe(1);
        expect(bytes.readUInt32LE(24)).toBe(44100);
        expect(bytes.readUInt32LE(40)).toBe(bytes.length - 44);
        let energy = 0;
        for (let i = 44; i < bytes.length; i += 2) energy += Math.abs(bytes.readInt16LE(i));
        expect(energy).toBeGreaterThan(1000);
        hashes.add(createHash('sha256').update(bytes).digest('hex'));
      }
    }
    expect(hashes.size).toBe(27);
  });
});
