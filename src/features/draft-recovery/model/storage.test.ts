import { beforeEach, describe, expect, it } from 'vitest';
import { createPattern, defaultView, setHit } from '../../../entities/drum-pattern';
import { loadDraft, saveDraft } from './storage';
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase('songkit');
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
describe('local drafts', () => {
  it('returns null initially and round-trips musical and view state', async () => {
    expect(await loadDraft()).toBeNull();
    const draft = {
      schemaVersion: 1 as const,
      pattern: setHit(createPattern(), 'snare', 120, 35),
      view: { ...defaultView, grid: 32 as const, scrollLeft: 144, position: 120 },
    };
    await saveDraft(draft);
    expect(await loadDraft()).toEqual(draft);
  });
  it('validates before overwriting a good draft', async () => {
    const draft = { schemaVersion: 1 as const, pattern: createPattern(), view: defaultView };
    await saveDraft(draft);
    await expect(saveDraft({ ...draft, view: { ...defaultView, bar: 20 } })).rejects.toThrow();
    expect(await loadDraft()).toEqual(draft);
  });
  it('preserves malformed data on failed recovery', async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('songkit', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('drafts');
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put({ schemaVersion: 99 }, 'current');
      tx.oncomplete = () => resolve();
    });
    db.close();
    await expect(loadDraft()).rejects.toThrow();
    await expect(loadDraft()).rejects.toThrow();
  });
});
