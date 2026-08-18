// IndexedDB-backed photo blob storage.
//
// Photos used to live as data URLs inside the Zustand-persisted localStorage
// state, which is fine for a handful but caps out around 5 MB on most
// browsers. IndexedDB has a much larger quota (typically 50 MB to multiple
// GB on Android Chrome), so we move the actual photo bytes into IndexedDB
// and keep only the photo metadata (id, name, type, brand, model, serial,
// tags, callouts, etc.) in localStorage.
//
// For V1.1 backups we still need the photo bytes available as data URLs —
// so the export path reads them back out of IndexedDB on demand. If
// IndexedDB is unavailable (older browser, private mode), we fall back to
// embedding data URLs in localStorage directly.

const DB_NAME = "coilside-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

let dbPromise: Promise<IDBDatabase | null> | null = null;

/** True when IndexedDB is available in this browser/session. */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      "indexedDB" in window &&
      typeof window.indexedDB.open === "function"
    );
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result as IDBDatabase);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Save a photo's data URL under its id.
 * No-op (resolves null) if IndexedDB is unavailable.
 */
export async function savePhotoBlob(
  id: string,
  dataUrl: string
): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ id, dataUrl });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Get a photo's data URL by id.
 * Returns null if not found OR IndexedDB unavailable.
 */
export async function getPhotoBlob(id: string): Promise<string | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const r = req.result as { id: string; dataUrl: string } | undefined;
        resolve(r ? r.dataUrl : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Get all photo blobs as a map {id -> dataUrl}.
 * Used by the backup exporter so we can build a self-contained JSON backup
 * that includes photo bytes when feasible.
 */
export async function getAllPhotoBlobs(): Promise<
  Record<string, string>
> {
  const db = await openDB();
  if (!db) return {};
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as { id: string; dataUrl: string }[];
        const out: Record<string, string> = {};
        for (const r of rows) out[r.id] = r.dataUrl;
        resolve(out);
      };
      req.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

/**
 * Delete a photo's blob by id.
 */
export async function deletePhotoBlob(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {};
    tx.onerror = () => {};
  } catch {
    /* ignore */
  }
}

/**
 * Clear ALL photo blobs (used by the "Erase All Data" action).
 */
export async function clearAllPhotoBlobs(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {};
    tx.onerror = () => {};
  } catch {
    /* ignore */
  }
}
