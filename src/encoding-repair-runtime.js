import { loadRemoteState, saveRemoteState } from './services/appStateApi.js'

const REPAIR_VERSION = '2026-06-12-v1'
const REPAIR_SESSION_KEY = 'fogao-encoding-repair-session'

function repairText(value) {
  if (typeof value !== 'string') return value

  return value
    .replace(/caj(?:�|\?)/gi, match => {
      const prefix = match.slice(0, 3)
      return prefix === prefix.toUpperCase() ? 'CAJÁ' : prefix[0] === prefix[0].toUpperCase() ? 'Cajá' : 'cajá'
    })
    .replace(/Refei(?:��|�ões|\?\?es)/gi, 'Refeições')
    .replace(/Por(?:��|�ão|\?\?o)/gi, 'Porção')
    .replace(/Lingui(?:�|\?)a/gi, 'Linguiça')
    .replace(/Água/gi, match => match)
}

function repairDeep(value) {
  if (typeof value === 'string') return repairText(value)
  if (Array.isArray(value)) return value.map(repairDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairDeep(item)]))
  }
  return value
}

function stableJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function repairLocalStorage() {
  let changed = false

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith('fogao-')) continue

    const raw = localStorage.getItem(key)
    if (raw == null) continue

    try {
      const parsed = JSON.parse(raw)
      const repaired = repairDeep(parsed)
      const next = stableJson(repaired)
      if (next && next !== raw) {
        localStorage.setItem(key, next)
        changed = true
      }
    } catch {
      const repaired = repairText(raw)
      if (repaired !== raw) {
        localStorage.setItem(key, repaired)
        changed = true
      }
    }
  }

  if (changed) {
    window.dispatchEvent(new Event('fogao-products-updated'))
    window.dispatchEvent(new Event('fogao-sales-history-updated'))
    window.dispatchEvent(new Event('fogao-closed-tables-updated'))
    window.dispatchEvent(new Event('fogao-closings-updated'))
  }

  return changed
}

async function repairRemoteState() {
  try {
    const current = await loadRemoteState()
    if (!current || !Object.keys(current).length) return false

    const repaired = repairDeep(current)
    if (stableJson(repaired) === stableJson(current)) return false

    await saveRemoteState(repaired)
    return true
  } catch {
    return false
  }
}

const localChanged = repairLocalStorage()

if (sessionStorage.getItem(REPAIR_SESSION_KEY) !== REPAIR_VERSION) {
  sessionStorage.setItem(REPAIR_SESSION_KEY, REPAIR_VERSION)
  repairRemoteState().then(remoteChanged => {
    if (!remoteChanged && !localChanged) return
    repairLocalStorage()
    window.setTimeout(() => window.location.reload(), 250)
  })
}
