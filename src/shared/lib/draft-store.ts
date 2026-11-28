export class DraftConflict extends Error {
  constructor() {
    super('Черновик изменён в другой вкладке.');
  }
}

export async function accessDraft<T>(
  database: string,
  update: (current: unknown) => { result: T; write?: unknown },
  mode: IDBTransactionMode = 'readonly',
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(database, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('drafts');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => {
      open.onsuccess = () => open.result.close();
      reject(new Error('Закройте другую вкладку SongKit и повторите'));
    };
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const store = tx.objectStore('drafts');
      const read = store.get('current');
      let result: T;
      read.onsuccess = () => {
        try {
          const next = update(read.result);
          result = next.result;
          if ('write' in next) {
            if (next.write === null) store.delete('current');
            else store.put(next.write, 'current');
          }
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error ?? new Error('Хранилище недоступно'));
    });
  } finally {
    db.close();
  }
}
