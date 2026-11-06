/** Browser-local file storage. This is not Apple's AirDrop or iCloud. */
export interface ImportedFile { id: string; name: string; blob: Blob; modified: number; }
const DB = 'ios-sim-imported-files';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveImportedFile(file: ImportedFile): Promise<void> {
  const db = await openDB();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(file);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
  window.dispatchEvent(new Event('ios-imported-files-changed'));
}
export async function listImportedFiles(): Promise<ImportedFile[]> {
  const db = await openDB();
  try { return await new Promise((resolve, reject) => {
    const req = db.transaction('files').objectStore('files').getAll();
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  }); } finally { db.close(); }
}
export async function clearImportedFiles(): Promise<void> {
  const db = await openDB();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  finally { db.close(); }
}
