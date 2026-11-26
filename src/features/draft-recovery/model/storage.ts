import { parseDraft, type Draft } from '../../../entities/drum-pattern';
import { accessDraft, DraftConflict } from '../../../shared/lib/draft-store';

export function loadDraft(): Promise<Draft | null> {
  return accessDraft('songkit', (raw) => ({ result: raw === undefined ? null : parseDraft(raw) }));
}

export function saveDraft(draft: Draft, expected: Draft | null | 'recovery' = null): Promise<void> {
  return accessDraft(
    'songkit',
    (raw) => {
      const next = parseDraft(draft);
      let current: Draft | null = null;
      if (raw !== undefined) {
        try {
          current = parseDraft(raw);
        } catch (error) {
          if (expected !== 'recovery') throw error;
        }
      }
      const snapshot = JSON.stringify(current);
      if (snapshot === JSON.stringify(next)) return { result: undefined };
      if (
        snapshot !==
        JSON.stringify(expected === 'recovery' ? null : expected && parseDraft(expected))
      )
        throw new DraftConflict();
      return { result: undefined, write: next };
    },
    'readwrite',
  );
}
