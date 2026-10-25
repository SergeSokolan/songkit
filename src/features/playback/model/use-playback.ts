import { useEffect, useRef, useState, useCallback } from 'react';
import type { Pattern, DrumEvent } from '../../../entities/drum-pattern';
import { DrumAudio } from './drum-audio';
import { Scheduler } from './scheduler';
export function usePlayback(
  pattern: Pattern,
  initialPosition: number,
  onPause: (tick: number) => void,
) {
  const patternRef = useRef(pattern);
  const pauseRef = useRef(onPause);
  useEffect(() => {
    patternRef.current = pattern;
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
  const stop = useCallback(() => {
    requestRef.current++;
    const tick = schedulerRef.current?.stop() ?? positionRef.current;
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
      schedulerRef.current?.stop();
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
      schedulerRef.current ??= new Scheduler(audioRef.current, () => patternRef.current);
      schedulerRef.current.start(positionRef.current);
      setPlaying(true);
    } catch (e) {
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
    if (playing) return;
    const request = requestRef.current;
    try {
      audioRef.current ??= new DrumAudio();
      await audioRef.current.prepare();
      if (request === requestRef.current && !document.hidden) audioRef.current.preview(event);
    } catch {
      /* Play displays actionable audio errors; silent editing remains available. */
    }
  };
  return { playing, loading, position, error, play, stop, reset, preview };
}
