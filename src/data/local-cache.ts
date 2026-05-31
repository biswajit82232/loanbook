import { normalizeSettings } from './settings'
import type { AppSettings, LoanBookData } from './types'
import { idbGetBook, idbPutBook, idbRemoveBook } from './book-idb'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

/** Storage key for local-only mode (no Supabase user). */
export const LOCAL_BOOK_STORAGE_ID = '__local__'

export interface LocalCacheBundle {
  data: LoanBookData
  settings: AppSettings
  savedAt: string
}

export interface SyncMeta {
  pendingChanges: boolean
  lastSyncedAt: string | null
  lastPullAt: string | null
  lastError: string | null
}

const CACHE_PREFIX = 'loanbook-cache-v2-'
const SYNC_META_PREFIX = 'loanbook-sync-v2-'
const LEGACY_LOCAL_ONLY_KEY = 'loanbook-data-v1'

const SAVE_DEBOUNCE_MS = 500

const memoryByKey = new Map<string, LocalCacheBundle>()
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
let cacheWarningHandler: ((message: string) => void) | null = null

const defaultSyncMeta = (): SyncMeta => ({
  pendingChanges: false,
  lastSyncedAt: null,
  lastPullAt: null,
  lastError: null,
})

function storageKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`
}

function syncMetaKey(userId: string) {
  return `${SYNC_META_PREFIX}${userId}`
}

function normalizeBundle(bundle: LocalCacheBundle): LocalCacheBundle {
  return {
    data: {
      ...bundle.data,
      partners: bundle.data.partners ?? [],
    },
    settings: normalizeSettings(bundle.settings),
    savedAt: bundle.savedAt ?? new Date().toISOString(),
  }
}

function legacyLocalStorageKey(userId: string): string {
  return userId === LOCAL_BOOK_STORAGE_ID
    ? LEGACY_LOCAL_ONLY_KEY
    : storageKey(userId)
}

function readLegacyLocalStorage(userId: string): LocalCacheBundle | null {
  try {
    const raw = localStorage.getItem(legacyLocalStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalCacheBundle
    if (!parsed?.data) return null
    return normalizeBundle(parsed)
  } catch {
    return null
  }
}

function clearLegacyLocalStorage(userId: string): void {
  try {
    localStorage.removeItem(legacyLocalStorageKey(userId))
  } catch {
    /* ignore */
  }
}

function warnCache(message: string) {
  cacheWarningHandler?.(message)
}

export function onLocalCacheWarning(handler: (message: string) => void): () => void {
  cacheWarningHandler = handler
  return () => {
    if (cacheWarningHandler === handler) cacheWarningHandler = null
  }
}

/** In-memory copy after load/save — safe for sync flush without awaiting IDB. */
export function peekLocalCache(userId: string): LocalCacheBundle | null {
  const key = storageKey(userId)
  return memoryByKey.get(key) ?? null
}

export async function loadLocalCache(userId: string): Promise<LocalCacheBundle | null> {
  const key = storageKey(userId)
  const cached = memoryByKey.get(key)
  if (cached) return cached

  let bundle = await idbGetBook<LocalCacheBundle>(key)
  if (!bundle) {
    bundle = readLegacyLocalStorage(userId)
    if (bundle) {
      const migrated = await idbPutBook(key, bundle)
      if (migrated.ok) clearLegacyLocalStorage(userId)
    }
  }

  if (!bundle) return null

  const normalized = normalizeBundle(bundle)
  memoryByKey.set(key, normalized)
  return normalized
}

async function flushSave(userId: string, bundle: LocalCacheBundle): Promise<void> {
  const key = storageKey(userId)
  const result = await idbPutBook(key, bundle)
  if (result.ok) {
    clearLegacyLocalStorage(userId)
    return
  }

  if (result.error === 'quota') {
    warnCache(
      'This device is low on storage. Your data is still in memory — sync to the cloud when you can.',
    )
    return
  }

  if (result.error === 'blocked') {
    warnCache('Private browsing blocked saving a copy on this device.')
    return
  }

  warnCache('Could not save a copy on this device. Use cloud sync if available.')
}

export function saveLocalCache(
  userId: string,
  data: LoanBookData,
  settings: AppSettings,
): void {
  const key = storageKey(userId)
  const bundle = normalizeBundle({
    data: { ...data, partners: data.partners ?? [] },
    settings,
    savedAt: new Date().toISOString(),
  })

  memoryByKey.set(key, bundle)

  const existing = saveTimers.get(key)
  if (existing) clearTimeout(existing)

  saveTimers.set(
    key,
    setTimeout(() => {
      saveTimers.delete(key)
      void flushSave(userId, bundle)
    }, SAVE_DEBOUNCE_MS),
  )
}

/** Persist immediately (e.g. after successful cloud sync). */
export async function saveLocalCacheNow(
  userId: string,
  data: LoanBookData,
  settings: AppSettings,
): Promise<void> {
  const key = storageKey(userId)
  const pending = saveTimers.get(key)
  if (pending) {
    clearTimeout(pending)
    saveTimers.delete(key)
  }

  const bundle = normalizeBundle({
    data: { ...data, partners: data.partners ?? [] },
    settings,
    savedAt: new Date().toISOString(),
  })
  memoryByKey.set(key, bundle)
  await flushSave(userId, bundle)
}

export function loadSyncMeta(userId: string): SyncMeta {
  try {
    const raw = localStorage.getItem(syncMetaKey(userId))
    if (!raw) return defaultSyncMeta()
    const parsed = JSON.parse(raw) as Partial<SyncMeta>
    return {
      pendingChanges: Boolean(parsed.pendingChanges),
      lastSyncedAt: parsed.lastSyncedAt ?? null,
      lastPullAt: parsed.lastPullAt ?? null,
      lastError: parsed.lastError ?? null,
    }
  } catch {
    return defaultSyncMeta()
  }
}

export function saveSyncMeta(userId: string, patch: Partial<SyncMeta>): SyncMeta {
  const next = { ...loadSyncMeta(userId), ...patch }
  try {
    localStorage.setItem(syncMetaKey(userId), JSON.stringify(next))
  } catch {
    warnCache('Could not save sync status on this device.')
  }
  return next
}

export async function clearLocalBookCache(userId: string): Promise<void> {
  const key = storageKey(userId)
  memoryByKey.delete(key)
  const pending = saveTimers.get(key)
  if (pending) {
    clearTimeout(pending)
    saveTimers.delete(key)
  }
  await idbRemoveBook(key)
  clearLegacyLocalStorage(userId)
}

export function formatSyncStatusLabel(
  status: SyncStatus,
  meta: SyncMeta,
): string {
  switch (status) {
    case 'syncing':
      return 'Syncing to cloud…'
    case 'synced':
      return meta.lastSyncedAt
        ? `Synced ${formatRelativeTime(meta.lastSyncedAt)}`
        : 'Synced'
    case 'error':
      return meta.lastError ? `Sync failed — ${meta.lastError}` : 'Sync failed'
    case 'offline':
      return 'Offline — showing saved copy'
    default:
      return meta.pendingChanges ? 'Changes pending sync' : 'Ready'
  }
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 10) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(iso).toLocaleString()
}
