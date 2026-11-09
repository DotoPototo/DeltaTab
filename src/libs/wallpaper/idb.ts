// IndexedDB rather than chrome.storage: it stores Blobs natively, with no base64 or JSON overhead.

const DB_NAME = 'deltatab';
const DB_VERSION = 1;
const STORES = ['images', 'thumbs'] as const;
export type StoreName = (typeof STORES)[number];

let connection: Promise<IDBDatabase> | undefined;

const promisify = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const open = () =>
  (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
  }));

const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

export const idbGet = async <T>(store: StoreName, key: string): Promise<T | undefined> => {
  const db = await open();
  return promisify<T | undefined>(db.transaction(store).objectStore(store).get(key));
};

export const idbKeys = async (store: StoreName): Promise<string[]> => {
  const db = await open();
  return promisify(db.transaction(store).objectStore(store).getAllKeys()) as Promise<string[]>;
};

export const idbPut = async (records: { store: StoreName; key: string; value: unknown }[]): Promise<void> => {
  const db = await open();
  const tx = db.transaction([...new Set(records.map((r) => r.store))], 'readwrite');
  for (const { store, key, value } of records) tx.objectStore(store).put(value, key);
  await complete(tx);
};

export const idbDelete = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  const db = await open();
  const tx = db.transaction(STORES, 'readwrite');
  for (const store of STORES) for (const key of keys) tx.objectStore(store).delete(key);
  await complete(tx);
};
