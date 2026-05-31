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
    window.location.reload()
  })

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true
      activateUpdate = updateSW
      emitUpdateState()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return

      const check = () => {
        if (document.visibilityState === 'visible') {
          void registration.update()
        }
      }

      document.addEventListener('visibilitychange', check)
      window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })
}
