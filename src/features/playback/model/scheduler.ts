import {
  BAR_TICKS,
  PPQ,
  totalTicks,
  type Pattern,
  type DrumEvent,
} from '../../../entities/drum-pattern';
export interface AudioDriver {
  now(): number;
  hit(event: DrumEvent, time: number): void;
  silence(): void;
}
export interface ScheduledPosition {
  tick: number;
  time: number;
}
// Polling only fills a short audio-clock queue. It never determines hit timestamps.
export class Scheduler {
  readonly lookAhead = 0.075;
  private running = false;
  private nextTime = 0;
  private tick = 0;
  private tempo = 100;
  private length = BAR_TICKS;
  private positions: ScheduledPosition[] = [];
  private position = 0;
  constructor(
    private driver: AudioDriver,
    private getPattern: (tick?: number) => Pattern,
  ) {}
  start(position = 0): void {
    if (this.running) return;
    const pattern = this.getPattern();
    this.tempo = pattern.tempo;
    this.length = totalTicks(pattern);
    this.tick = (Math.floor(position / 120) * 120) % this.length;
    this.position = this.tick;
    this.nextTime = this.driver.now() + 0.025;
    this.running = true;
    this.pump();
  }
  pump(): void {
    if (!this.running) return;
    const now = this.driver.now();
    // A suspended/background tab must never dump a backlog into the output.
    if (this.nextTime < now - 0.15) {
      this.stop();
      return;
    }
    while (this.nextTime < now + this.lookAhead) {
      const pattern = this.getPattern(this.tick);
      if (this.tick % PPQ === 0) this.tempo = pattern.tempo;
      if (this.tick % BAR_TICKS === 0) {
        this.length = totalTicks(pattern);
        this.tick %= this.length;
      }
      for (const event of pattern.events)
        if (event.tick === this.tick) this.driver.hit(event, this.nextTime);
      this.positions.push({ tick: this.tick, time: this.nextTime });
      this.tick = (this.tick + 120) % this.length;
      this.nextTime += 60 / this.tempo / 8;
    }
  }
  currentPosition(): number {
    const now = this.driver.now();
    while (this.positions.length && this.positions[0].time <= now)
      this.position = this.positions.shift()!.tick;
    return this.position;
  }
  isRunning(): boolean {
    return this.running;
  }
  stop(): number {
    this.currentPosition();
    this.running = false;
    this.driver.silence();
    this.positions = [];
    return this.position;
  }
}
