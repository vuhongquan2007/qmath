import { Assignment, ClassGroup } from "../types";

const DB_NAME = "thptqg_large_storage";
const STORE_NAME = "files";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("IndexedDB open error:", request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function saveLargeFile(key: string, data: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to save to IndexedDB, falling back to in-memory:", err);
    if (typeof window !== "undefined") {
      (window as any)._largeFileCache = (window as any)._largeFileCache || {};
      (window as any)._largeFileCache[key] = data;
    }
  }
}

export async function getLargeFile(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get from IndexedDB, trying memory fallback:", err);
    if (typeof window !== "undefined" && (window as any)._largeFileCache) {
      return (window as any)._largeFileCache[key] || null;
    }
    return null;
  }
}

export async function deleteLargeFile(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to delete from IndexedDB:", err);
  }
}

/**
 * Strips heavy base64 data from assignments and lectures, saves them to IndexedDB,
 * and saves only lightweight metadata references to localStorage.
 */
export async function saveStateToStorage(assignments: Assignment[], classGroups: ClassGroup[]): Promise<void> {
  try {
    // 1. Process and save assignments
    const assignmentsToSave = await Promise.all(
      assignments.map(async (asm) => {
        if (asm.fileData && asm.fileData.startsWith("data:")) {
          const fileKey = `assignment_file_${asm.id}`;
          await saveLargeFile(fileKey, asm.fileData);
          return { ...asm, fileData: `IndexedDB:${fileKey}` };
        }
        return asm;
      })
    );

    // 2. Process and save class groups & lectures
    const classGroupsToSave = await Promise.all(
      classGroups.map(async (cg) => {
        const lecturesToSave = await Promise.all(
          (cg.lectures || []).map(async (lec) => {
            if (lec.fileData && lec.fileData.startsWith("data:")) {
              const fileKey = `lecture_file_${lec.id}`;
              await saveLargeFile(fileKey, lec.fileData);
              return { ...lec, fileData: `IndexedDB:${fileKey}` };
            }
            return lec;
          })
        );
        return { ...cg, lectures: lecturesToSave };
      })
    );

    // 3. Write lightweight JSON to localStorage (safe from quota limits)
    localStorage.setItem("thptqg_assignments", JSON.stringify(assignmentsToSave));
    localStorage.setItem("thptqg_class_groups", JSON.stringify(classGroupsToSave));
  } catch (error) {
    console.error("Critical error in saveStateToStorage:", error);
  }
}
