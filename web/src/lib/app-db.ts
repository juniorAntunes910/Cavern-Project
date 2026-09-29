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

export async function deleteDatabaseValue(key: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

const pendingWrites = new Map<string, Promise<void>>()
export function persistDatabaseValue<T>(key: string, value: T) {
  const previous = pendingWrites.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(() => setDatabaseValue(key, value))
  pendingWrites.set(key, next)
  void next.catch(error => console.error('Não foi possível persistir os dados locais.', error)).finally(() => {
    if (pendingWrites.get(key) === next) pendingWrites.delete(key)
  })
}

export async function initializeLocalDatabase(keys: readonly string[]) {
  for (const key of keys) {
    const databaseValue = await readDatabaseValue<unknown>(key)
    const legacyValue = localStorage.getItem(key)

    if (legacyValue !== null) {
      try {
        const localValue = JSON.parse(legacyValue) as unknown
        if (databaseValue === undefined || JSON.stringify(databaseValue) !== legacyValue) {
          await setDatabaseValue(key, localValue).catch(error => console.error(`Não foi possível sincronizar ${key} com o IndexedDB.`, error))
        }
        continue
      } catch (error) {
        console.error(`Dados locais inválidos para ${key}; tentando restaurar do IndexedDB.`, error)
      }
    }
    if (databaseValue !== undefined) localStorage.setItem(key, JSON.stringify(databaseValue))
  }
}
