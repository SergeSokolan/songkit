import type { Pattern } from '../../../entities/drum-pattern';
export interface Audition {
  pattern: Pattern;
  start: number;
  end: number;
}
// One transport; latch a candidate only when entering its selected interval.
export class AuditionSelector {
  private active: Audition | undefined;
  resolve(confirmed: Pattern, candidate: Audition | undefined, tick?: number): Pattern {
    if (!candidate) this.active = undefined;
    if (candidate && tick === candidate.start) this.active = candidate;
    const active = this.active;
    return active && tick !== undefined && tick >= active.start && tick < active.end
      ? { ...active.pattern, tempo: confirmed.tempo }
      : confirmed;
  }
  reset() {
    this.active = undefined;
  }
}
