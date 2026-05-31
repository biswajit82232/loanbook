const DB_NAME = 'loanbook'
const DB_VERSION = 1
const STORE = 'books'

export type BookStoreError = 'quota' | 'blocked' | 'unknown'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB_unavailable'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('idb_open_failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })

  return dbPromise
}

function classifyIdbError(err: unknown): BookStoreError {
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') return 'quota'
    if (err.name === 'SecurityError') return 'blocked'
  }
  return 'unknown'
}

export async function idbGetBook<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const request = store.get(key)
      request.onsuccess = () => {
        const value = request.result as T | undefined
        resolve(value ?? null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function idbPutBook(
  key: string,
  bundle: unknown,
): Promise<{ ok: true } | { ok: false; error: BookStoreError }> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const request = store.put(bundle, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      tx.onerror = () => reject(tx.error)
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: classifyIdbError(err) }
  }
}

export async function idbRemoveBook(key: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch {
    /* ignore */
  }
}
