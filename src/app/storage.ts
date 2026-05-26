import { AppState, EMPTY_STATE } from "./model";

const DB_NAME = "getbook";
const DB_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = action(store);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

export async function loadAppState(): Promise<AppState> {
  const state = await runTransaction<AppState | undefined>("readonly", (store) =>
    store.get(STATE_KEY)
  );
  return state ?? EMPTY_STATE;
}

export async function saveAppState(state: AppState): Promise<void> {
  await runTransaction<IDBValidKey>("readwrite", (store) =>
    store.put(state, STATE_KEY)
  );
}
