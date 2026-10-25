import { useCallback, useState } from 'react';
import { commit, undo, redo, type History, type Pattern } from '../../../entities/drum-pattern';
export function usePattern(initial: Pattern) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const change = useCallback(
    (update: (pattern: Pattern) => Pattern) => setHistory((h) => commit(h, update(h.present))),
    [],
  );
  return {
    pattern: history.present,
    change,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => setHistory(undo),
    redo: () => setHistory(redo),
  };
}
