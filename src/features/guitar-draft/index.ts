import { validLoop, type Loop } from '../../entities/guitar-loop';
import { accessDraft, DraftConflict } from '../../shared/lib/draft-store';

const journalKey = 'songkit.guitar.pending';
type Journal = { format: 2; loop: Loop | null; bases: string[] };
let base = 'null';
let writing: string | undefined;
let sequence = 0;
let pending = Promise.resolve();
const fingerprint = (raw: unknown) => JSON.stringify(raw ?? null);

function writeJournal(value: Journal | null) {
  try {
    if (value) sessionStorage.setItem(journalKey, JSON.stringify(value));
    else sessionStorage.removeItem(journalKey);
  } catch {
    // IndexedDB still works when tab storage is unavailable.
  }
}

function readJournal(): Journal | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(journalKey);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (
    value?.format === 2 &&
    Array.isArray(value.bases) &&
    value.bases.length > 0 &&
    value.bases.every((item: unknown) => typeof item === 'string') &&
    (value.loop === null || validLoop(value.loop))
  )
    return value;
  // Older journals have no baseline. Replay only over an empty or identical draft.
  if (value === null || validLoop(value)) return { format: 2, loop: value, bases: ['null'] };
  throw new Error('Invalid pending guitar draft');
}

async function commit(loop: Loop | null, bases: string[]) {
  const next = fingerprint(loop);
  await accessDraft(
    'songkit-guitar',
    (raw) => {
      const stored = fingerprint(raw);
      if (stored === next) return { result: undefined };
      if (!bases.includes(stored)) throw new DraftConflict();
      return { result: undefined, write: loop };
    },
    'readwrite',
  );
  base = next;
}

export function saveLoop(loop: Loop | null) {
  const id = ++sequence;
  // Only the active transaction and the latest queued edit can survive navigation.
  const bases = writing === undefined ? [base] : [base, writing];
  writeJournal({ format: 2, loop, bases });
  pending = pending
    .catch(() => {})
    .then(async () => {
      if (id !== sequence) return;
      writing = fingerprint(loop);
      try {
        await commit(loop, [base]);
        if (id === sequence) writeJournal(null);
      } finally {
        writing = undefined;
      }
    });
  return pending;
}

export async function loadLoop(
  discardPending = false,
): Promise<{ loop: Loop | null; conflict: boolean }> {
  await pending.catch(() => {});
  const raw = await accessDraft('songkit-guitar', (value) => ({ result: value }));
  base = fingerprint(raw);
  const journal = discardPending ? null : readJournal();
  if (journal) {
    try {
      await commit(journal.loop, journal.bases);
      writeJournal(null);
      return { loop: journal.loop, conflict: false };
    } catch (error) {
      if (!(error instanceof DraftConflict)) throw error;
      // Keep the local revision editable without adopting the other tab's baseline.
      base = journal.bases[0];
      return { loop: journal.loop, conflict: true };
    }
  }
  if (raw !== undefined && !validLoop(raw)) throw new Error('Invalid guitar draft');
  if (discardPending) writeJournal(null);
  return { loop: raw ?? null, conflict: false };
}
