const databaseName = 'cavern-app'
const storeName = 'records'
const databaseVersion = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readDatabaseValue<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase()
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const request = database.transaction(storeName).objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return value
}

export async function setDatabaseValue<T>(key: string, value: T): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export function persistDatabaseValue<T>(key: string, value: T) {
  void setDatabaseValue(key, value).catch(error => console.error('Não foi possível persistir os dados locais.', error))
}

export async function initializeLocalDatabase(keys: readonly string[]) {
  for (const key of keys) {
    const databaseValue = await readDatabaseValue<unknown>(key)
    const legacyValue = localStorage.getItem(key)

    if (databaseValue !== undefined) {
      localStorage.setItem(key, JSON.stringify(databaseValue))
      continue
    }

    if (legacyValue !== null) {
      try {
        await setDatabaseValue(key, JSON.parse(legacyValue) as unknown)
      } catch (error) {
        console.error(`Não foi possível migrar ${key} para o IndexedDB.`, error)
      }
    }
  }
}
