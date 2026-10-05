import { vi } from 'vitest'

// The data layer only needs a synchronous key-value store and an event target, so unit tests run in plain Node
// with these two stand-ins instead of a full DOM implementation.
class MemoryStorage {
  #items = new Map<string, string>()
  get length() { return this.#items.size }
  clear() { this.#items.clear() }
  getItem(key: string) { return this.#items.get(key) ?? null }
  key(index: number) { return [...this.#items.keys()][index] ?? null }
  removeItem(key: string) { this.#items.delete(key) }
  setItem(key: string, value: string) { this.#items.set(key, String(value)) }
}

const storage = new MemoryStorage() as unknown as Storage
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
Object.defineProperty(globalThis, 'window', { value: Object.assign(new EventTarget(), { localStorage: storage }), configurable: true, writable: true })

// IndexedDB mirroring is asynchronous and not what these tests exercise.
vi.mock('../lib/app-db', () => ({
  persistDatabaseValue: vi.fn(),
  readDatabaseValue: vi.fn(),
  setDatabaseValue: vi.fn(),
  deleteDatabaseValue: vi.fn(),
  initializeLocalDatabase: vi.fn(),
}))
