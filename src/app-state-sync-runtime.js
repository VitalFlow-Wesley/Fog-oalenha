const STATE_KEYS = {
  users: 'fogao-users-v1',
  tables: 'fogao-tables-v1',
  settings: 'fogao-settings-v1',
  products: 'fogao-products-v1',
  salesHistory: 'fogao-sales-history-v1',
  closings: 'fogao-closings-v1',
  closedTablesHistory: 'fogao-closed-tables-v1',
}

const SYNC_EVENTS = [
  'fogao-products-updated',
  'fogao-sales-history-updated',
  'fogao-closings-updated',
  'fogao-closed-tables-updated',
  'fogao-tables-updated',
  'fogao-users-updated',
  'fogao-settings-updated',
]

let timer = null
let inFlight = false
let pending = false
let retryDelay = 1500
let lastPayload = ''
let remoteDisabled = import.meta.env.DEV

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function buildState() {
  return Object.fromEntries(Object.entries(STATE_KEYS).map(([field, key]) => {
    const fallback = field === 'settings' ? {} : []
    return [field, readJson(key, fallback)]
  }))
}

function setStatus(status) {
  document.documentElement.dataset.syncStatus = status
  window.dispatchEvent(new CustomEvent('fogao-sync-status', { detail: { status } }))
}

async function syncNow() {
  if (remoteDisabled) {
    setStatus('local')
    return
  }

  if (!navigator.onLine) {
    setStatus('offline')
    pending = true
    return
  }

  if (inFlight) {
    pending = true
    return
  }

  const state = buildState()
  const payload = JSON.stringify(state)
  if (payload === lastPayload && !pending) {
    setStatus('saved')
    return
  }

  inFlight = true
  pending = false
  setStatus('saving')

  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      cache: 'no-store',
    })

    if (response.status === 404 || response.status === 405) {
      remoteDisabled = true
      pending = false
      setStatus('local')
      return
    }

    if (!response.ok) throw new Error(`Falha ao sincronizar: ${response.status}`)

    lastPayload = payload
    retryDelay = 1500
    setStatus('saved')
  } catch (error) {
    console.warn('Sincronização pendente:', error.message)
    pending = true
    setStatus('error')
    window.setTimeout(syncNow, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 30000)
  } finally {
    inFlight = false
    if (pending && navigator.onLine) scheduleSync(250)
  }
}

function scheduleSync(delay = 700) {
  window.clearTimeout(timer)
  timer = window.setTimeout(syncNow, delay)
}

SYNC_EVENTS.forEach(eventName => window.addEventListener(eventName, () => scheduleSync()))

window.addEventListener('storage', event => {
  if (Object.values(STATE_KEYS).includes(event.key)) scheduleSync(300)
})

window.addEventListener('online', () => {
  setStatus('saving')
  scheduleSync(100)
})

window.addEventListener('offline', () => setStatus('offline'))

window.addEventListener('beforeunload', () => {
  if (!pending || !navigator.sendBeacon) return
  try {
    const blob = new Blob([JSON.stringify(buildState())], { type: 'application/json' })
    navigator.sendBeacon('/api/state', blob)
  } catch {
    // O próximo carregamento tenta sincronizar novamente.
  }
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleSync(250)
})

setStatus(navigator.onLine ? 'saved' : 'offline')
window.setTimeout(() => scheduleSync(0), 1200)
