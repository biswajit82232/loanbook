import { registerSW } from 'virtual:pwa-register'

/** Reload app shell when a new build is deployed; loan data stays in Supabase / localStorage. */
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
      void updateSW(true)
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
