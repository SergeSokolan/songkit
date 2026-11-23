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
export function saveLoop(loop: Loop | null) {
  pending = pending.catch(() => null).then(() => access(true, loop));
  return pending;
}
export async function loadLoop() {
  await pending.catch(() => null);
  return access(false);
}
