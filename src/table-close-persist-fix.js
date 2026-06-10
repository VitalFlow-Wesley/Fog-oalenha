const TABLES_KEY = 'fogao-tables-v1'
const USERS_KEY = 'fogao-users-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

async function syncCurrentState() {
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: readJson(USERS_KEY, []),
        tables: readJson(TABLES_KEY, []),
        settings: readJson(SETTINGS_KEY, {}),
        products: readJson(PRODUCTS_KEY, []),
      }),
    })
  } catch (error) {
    console.warn('Nao foi possivel salvar mesas no servidor agora:', error.message)
  }
}

function scheduleSync() {
  window.clearTimeout(window.__fogaoTableCloseSyncTimer)
  window.__fogaoTableCloseSyncTimer = window.setTimeout(syncCurrentState, 900)
}

if (!window.__fogaoTableClosePersistFixInstalled) {
  window.__fogaoTableClosePersistFixInstalled = true

  document.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return

    const label = button.textContent.trim().toLowerCase()
    const isTableClose = label.includes('fechar mesa')
    const isCashClose = label.includes('sim, fechar caixa') || label.includes('autorizar fechamento')

    if (isTableClose || isCashClose) scheduleSync()
  }, true)

  window.addEventListener('beforeunload', () => {
    const payload = JSON.stringify({
      users: readJson(USERS_KEY, []),
      tables: readJson(TABLES_KEY, []),
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
    })

    try {
      navigator.sendBeacon('/api/state', new Blob([payload], { type: 'application/json' }))
    } catch {
      // Fallback silencioso.
    }
  })
}
