import { AuditionSelector, type Audition } from './audition';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Pattern, DrumEvent } from '../../../entities/drum-pattern';
import { DrumAudio } from './drum-audio';
import { Scheduler } from './scheduler';
export function usePlayback(
  pattern: Pattern,
  initialPosition: number,
  onPause: (tick: number) => void,
  audition?: Audition,
) {
  const patternRef = useRef(pattern);
  const auditionRef = useRef(audition);
  const activeAudition = useRef(new AuditionSelector());
  const pauseRef = useRef(onPause);
  useEffect(() => {
    patternRef.current = pattern;
    auditionRef.current = audition;
    if (!audition) activeAudition.current.reset();
    pauseRef.current = onPause;
  });
  const audioRef = useRef<DrumAudio | null>(null);
  const schedulerRef = useRef<Scheduler | null>(null);
  const requestRef = useRef(0);
  const positionRef = useRef(initialPosition);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [error, setError] = useState('');
  const [soundTested, setSoundTested] = useState(false);
  const stop = useCallback(() => {
    requestRef.current++;
    activeAudition.current.reset();
    const tick = schedulerRef.current?.stop() ?? positionRef.current;
    audioRef.current?.silence();
    positionRef.current = tick;
    setPosition(tick);
    setPlaying(false);
    setLoading(false);
    pauseRef.current(tick);
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    const invalidatePending = () => {
      requestRef.current++;
    };
    const disposeAudio = () => {
      schedulerRef.current?.stop();
      audioRef.current?.reset();
      audioRef.current = null;
      schedulerRef.current = null;
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', stop);
    const timer = window.setInterval(() => {
      const scheduler = schedulerRef.current;
      if (!scheduler?.isRunning()) return;
      scheduler.pump();
      if (!scheduler.isRunning()) {
        stop();
        return;
      }
      const tick = scheduler.currentPosition();
      positionRef.current = tick;
      setPosition(tick);
    }, 25);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', stop);
      invalidatePending();
      disposeAudio();
    };
  }, [stop]);
  const play = async () => {
    if (playing || loading) return;
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      audioRef.current ??= new DrumAudio();
      audioRef.current.onSuspend = stop;
      await audioRef.current.prepare();
      if (request !== requestRef.current || document.hidden) return;
      schedulerRef.current ??= new Scheduler(audioRef.current, (tick) => {
        return activeAudition.current.resolve(patternRef.current, auditionRef.current, tick);
      });
      schedulerRef.current.start(positionRef.current);
      setPlaying(true);
    } catch (e) {
      if (request === requestRef.current)
        setError(e instanceof Error ? e.message : 'Не удалось запустить звук');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };
  const reset = () => {
    stop();
    positionRef.current = 0;
    setPosition(0);
    pauseRef.current(0);
    schedulerRef.current = null;
  };
  const preview = async (event: DrumEvent) => {
    if (playing || loading) return;
    const request = requestRef.current;
    try {
      audioRef.current ??= new DrumAudio();
      await audioRef.current.prepare();
      if (request === requestRef.current && !document.hidden) audioRef.current.preview(event);
    } catch {
      /* Play displays actionable audio errors; silent editing remains available. */
    }
  };
  const checkSound = async () => {
    stop();
    schedulerRef.current = null;
    audioRef.current?.reset();
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    setSoundTested(false);
    try {
      audioRef.current ??= new DrumAudio();
      audioRef.current.onSuspend = stop;
      await audioRef.current.prepare();
      if (request !== requestRef.current || document.hidden) return;
      const time = audioRef.current.now() + 0.02;
      for (const [i, instrument] of (['kick', 'snare', 'hat'] as const).entries())
        audioRef.current.hit(
          { id: 'sound-check', instrument, tick: 0, velocity: 100 },
          time + i * 0.2,
        );
      setSoundTested(true);
    } catch (e) {
      if (request === requestRef.current)
        setError(e instanceof Error ? e.message : 'Не удалось запустить звук');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };
  return { playing, loading, position, error, play, stop, reset, preview, checkSound, soundTested };
}
