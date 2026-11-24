import { validLoop, type Loop } from '../../entities/guitar-loop';
async function access(write: boolean, value?: Loop | null): Promise<Loop | null> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('songkit-guitar', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('drafts');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    return await new Promise<Loop | null>((resolve, reject) => {
      const tx = db.transaction('drafts', write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('drafts');
      const request = write
        ? value
          ? store.put(value, 'current')
          : store.delete('current')
        : store.get('current');
      tx.oncomplete = () => {
        if (write || request.result === undefined) resolve(null);
        else if (validLoop(request.result)) resolve(request.result);
        else reject(new Error('Invalid guitar draft'));
      };
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
let pending = Promise.resolve<Loop | null>(null);
const journalKey = 'songkit.guitar.pending';
let sequence = 0;
export function saveLoop(loop: Loop | null) {
  const id = ++sequence;
  // A navigation can interrupt an IDB transaction. Keep the latest edit in this tab until commit.
  try {
    sessionStorage.setItem(journalKey, JSON.stringify(loop));
  } catch {
    /* IndexedDB remains available in some restricted browsers. */
  }
  pending = pending
    .catch(() => null)
    .then(() => access(true, loop))
    .then((result) => {
      if (id === sequence) {
        try {
          sessionStorage.removeItem(journalKey);
        } catch {
          /* Storage access is optional. */
        }
      }
      return result;
    });
  return pending;
}
export async function loadLoop() {
  await pending.catch(() => null);
  let journal: string | null = null;
  try {
    journal = sessionStorage.getItem(journalKey);
  } catch {
    /* Continue with IndexedDB. */
  }
  if (journal !== null) {
    const recovered: unknown = JSON.parse(journal);
    if (recovered !== null && !validLoop(recovered))
      throw new Error('Invalid pending guitar draft');
    await saveLoop(recovered);
    return recovered;
  }
  return access(false);
}
