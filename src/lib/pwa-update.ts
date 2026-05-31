import { registerSW } from 'virtual:pwa-register'

type UpdateListener = (available: boolean) => void

let updateAvailable = false
let activateUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null
const listeners = new Set<UpdateListener>()

function emitUpdateState() {
  for (const listener of listeners) {
    listener(updateAvailable)
  }
}

function markUpdateReady(apply: (reloadPage?: boolean) => Promise<void>) {
  updateAvailable = true
  activateUpdate = apply
  emitUpdateState()
}

/** True when a new SW is installed but waiting for user to reload (prompt mode). */
function hasWaitingUpdate(registration: ServiceWorkerRegistration): boolean {
  return Boolean(registration.waiting && navigator.serviceWorker.controller)
}

function watchRegistration(
  registration: ServiceWorkerRegistration,
  apply: (reloadPage?: boolean) => Promise<void>,
) {
  if (hasWaitingUpdate(registration)) {
    markUpdateReady(apply)
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return

    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && hasWaitingUpdate(registration)) {
        markUpdateReady(apply)
      }
    })
  })
}

export function subscribeAppUpdate(listener: UpdateListener): () => void {
  listeners.add(listener)
  listener(updateAvailable)
  return () => listeners.delete(listener)
}

export function isAppUpdateAvailable(): boolean {
  return updateAvailable
}

/** Apply waiting service worker and reload the app shell. */
export async function applyAppUpdate(): Promise<void> {
  if (activateUpdate) {
    await activateUpdate(true)
    return
  }
  window.location.reload()
}

/** Reload app shell when a new build is deployed; loan data stays in Supabase / device cache. */
export function registerAppUpdates() {
  if (!import.meta.env.PROD) return

  let refreshing = false
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    updateAvailable = false
    window.location.reload()
  })

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      markUpdateReady(updateSW)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return

      watchRegistration(registration, updateSW)

      const checkForUpdate = () => {
        if (document.visibilityState === 'visible') {
          void registration.update().then(() => {
            if (hasWaitingUpdate(registration)) {
              markUpdateReady(updateSW)
            }
          })
        }
      }

      document.addEventListener('visibilitychange', checkForUpdate)
      window.setInterval(checkForUpdate, 5 * 60 * 1000)
    },
  })
}
