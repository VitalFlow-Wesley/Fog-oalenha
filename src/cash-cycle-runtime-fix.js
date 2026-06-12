const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'

const nativeGetItem = Storage.prototype.getItem
let refreshingClosingPage = false
let pageSyncScheduled = false

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || 'null')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isCurrentClosingPage() {
  const page = document.querySelector('.closingPage')
  if (!page) return false
  const selectedDate = page.querySelector('input[type="date"]')?.value
  return !selectedDate || selectedDate === todayKey()
}

function latestClosingTimestamp() {
  const closings = safeParse(nativeGetItem.call(localStorage, CLOSINGS_KEY), [])
  if (!Array.isArray(closings) || !closings.length) return 0

  return closings.reduce((latest, closing) => {
    const timestamp = new Date(closing?.closedAt || 0).getTime()
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
  }, 0)
}

function filterCurrentCashHistory(rawValue) {
  const history = safeParse(rawValue, [])
  if (!Array.isArray(history)) return rawValue

  const lastClosingAt = latestClosingTimestamp()
  if (!lastClosingAt) return rawValue

  const currentCycle = history.filter(record => {
    const closedAt = new Date(record?.closedAt || 0).getTime()
    return Number.isFinite(closedAt) && closedAt > lastClosingAt
  })

  return JSON.stringify(currentCycle)
}

Storage.prototype.getItem = function patchedGetItem(key) {
  const value = nativeGetItem.call(this, key)
  if (this === localStorage && key === CLOSED_TABLES_KEY && isCurrentClosingPage()) {
    return filterCurrentCashHistory(value)
  }
  return value
}

function requestClosingDataRefresh() {
  if (!isCurrentClosingPage() || pageSyncScheduled) return
  pageSyncScheduled = true
  window.setTimeout(() => {
    pageSyncScheduled = false
    window.dispatchEvent(new Event('fogao-closed-tables-updated'))
  }, 50)
}

function findNavButton(label) {
  return [...document.querySelectorAll('.navItem')].find(button =>
    button.textContent?.trim().toLowerCase().includes(label.toLowerCase())
  )
}

function remountClosingPageAfterSuccess() {
  if (refreshingClosingPage) return
  const success = document.querySelector('.closingSuccessMessage')
  const closingPage = document.querySelector('.closingPage.cashClosed')
  if (!success || !closingPage) return

  const mesasButton = findNavButton('Mesas')
  const fechamentoButton = findNavButton('Fechamento')
  if (!mesasButton || !fechamentoButton) return

  refreshingClosingPage = true
  window.setTimeout(() => {
    mesasButton.click()
    window.setTimeout(() => {
      fechamentoButton.click()
      window.setTimeout(() => {
        refreshingClosingPage = false
        requestClosingDataRefresh()
      }, 120)
    }, 120)
  }, 700)
}

const observer = new MutationObserver(() => {
  requestClosingDataRefresh()
  remountClosingPageAfterSuccess()
})

observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('fogao-closings-updated', () => {
  window.setTimeout(() => {
    requestClosingDataRefresh()
    remountClosingPageAfterSuccess()
  }, 100)
})
window.addEventListener('focus', requestClosingDataRefresh)
window.setTimeout(requestClosingDataRefresh, 250)
