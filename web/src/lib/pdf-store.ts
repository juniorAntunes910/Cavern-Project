const databaseName = 'cavern-pdfs'
const storeName = 'files'

function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => request.result.createObjectStore(storeName); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }) }
export async function savePdf(id: string, file: Blob) { const db = await database(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).put(file, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }); db.close() }
export async function loadPdf(id: string): Promise<Blob | undefined> { const db = await database(); const result = await new Promise<Blob | undefined>((resolve, reject) => { const request = db.transaction(storeName).objectStore(storeName).get(id); request.onsuccess = () => resolve(request.result as Blob | undefined); request.onerror = () => reject(request.error) }); db.close(); return result }
export async function deletePdf(id: string) { const db = await database(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(storeName, 'readwrite'); tx.objectStore(storeName).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }); db.close() }
