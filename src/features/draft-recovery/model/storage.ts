import { parseDraft, type Draft } from '../../../entities/drum-pattern';
const DB_NAME = 'songkit';
const STORE = 'drafts';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Хранилище недоступно'));
    request.onblocked = () => reject(new Error('Закройте другую вкладку SongKit и повторите'));
  });
}
export async function loadDraft(): Promise<Draft | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get('current');
    tx.oncomplete = () => {
      db.close();
      try {
        resolve(request.result === undefined ? null : parseDraft(request.result));
      } catch (e) {
        reject(e);
      }
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function saveDraft(draft: Draft): Promise<void> {
  const validated = parseDraft(draft);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(validated, 'current');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
