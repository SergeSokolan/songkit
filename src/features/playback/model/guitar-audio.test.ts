import { afterEach, expect, test, vi } from 'vitest';
import { GuitarAudio } from './guitar-audio';

function mockContext() {
  let state: AudioContextState = 'running';
  const events = new EventTarget();
  const context = {
    get state() {
      return state;
    },
    set state(v: AudioContextState) {
      state = v;
      events.dispatchEvent(new Event('statechange'));
    },
    destination: {},
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    createGain: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
  };
  const construct = vi.fn(function () {
    return context;
  });
  vi.stubGlobal('AudioContext', construct);
  return { context, construct };
}
afterEach(() => vi.unstubAllGlobals());

test('reuses the unlocked context, disconnects the old route, and signals interruptions only while playing', async () => {
  const { context, construct } = mockContext();
  const audio = new GuitarAudio();
  const interrupted = vi.fn();
  const first = await audio.prepare(interrupted);
  audio.stop();
  expect(first?.output.disconnect).toHaveBeenCalledOnce();
  const second = await audio.prepare(interrupted);
  expect(construct).toHaveBeenCalledOnce();
  expect(second?.output).not.toBe(first?.output);
  context.state = 'suspended';
  expect(interrupted).toHaveBeenCalledOnce();
  audio.dispose();
  expect(context.close).toHaveBeenCalledOnce();
  context.state = 'closed';
  expect(interrupted).toHaveBeenCalledOnce();
});

test('a cancelled resume cannot attach a new output when it eventually resolves', async () => {
  const { context } = mockContext();
  const audio = new GuitarAudio();
  context.state = 'suspended';
  let finish = () => {};
  context.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const opening = audio.prepare(vi.fn());
  audio.stop();
  context.state = 'running';
  finish();
  await expect(opening).resolves.toBe(null);
  expect(context.createGain).not.toHaveBeenCalled();
  audio.dispose();
});
