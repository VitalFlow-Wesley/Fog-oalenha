const TABLES_KEY = 'fogao-tables-v1'
const REOPEN_KEY = 'fogao-reopen-table-after-item-note'

function readTables() {
  try {
    const value = JSON.parse(localStorage.getItem(TABLES_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function currentTableNumber(drawer) {
  const title = drawer.querySelector('.commandTitleRow h2')?.textContent || ''
  const match = title.match(/Mesa\s+(\d+)/i)
  return match?.[1]?.padStart(2, '0') || ''
}

function saveObservation(drawer, itemIndex, observation) {
  const tableNumber = currentTableNumber(drawer)
  if (!tableNumber) return false

  const tables = readTables()
  let changed = false
  const nextTables = tables.map(table => {
    if (String(table.number || '').padStart(2, '0') !== tableNumber) return table
    if (!Array.isArray(table.items) || !table.items[itemIndex]) return table

    const items = table.items.map((item, index) => (
      index === itemIndex ? { ...item, observation: observation.trim() } : item
    ))
    changed = true
    return { ...table, items }
  })

  if (!changed) return false
  localStorage.setItem(TABLES_KEY, JSON.stringify(nextTables))
  window.dispatchEvent(new Event('fogao-tables-updated'))
  sessionStorage.setItem(REOPEN_KEY, tableNumber)
  return true
}

function createEditor(drawer, itemElement, itemIndex) {
  if (itemElement.dataset.observationEditor === 'true') return

  const info = itemElement.querySelector('.commandItemInfo')
  if (!info) return

  const oldObservation = Array.from(info.querySelectorAll('small')).find(element => (
    element.textContent.trim().toLowerCase().startsWith('obs.:')
  ))
  const currentValue = oldObservation
    ? oldObservation.textContent.replace(/^obs\.:\s*/i, '').trim()
    : ''

  if (oldObservation) oldObservation.remove()

  const wrapper = document.createElement('label')
  wrapper.className = 'commandItemObservationEditor'

  const label = document.createElement('span')
  label.textContent = 'Observação'

  const input = document.createElement('input')
  input.type = 'text'
  input.maxLength = 100
  input.value = currentValue
  input.placeholder = 'Ex.: sem açúcar, mal passado, sem cebola'
  input.setAttribute('aria-label', 'Observação deste item')

  let originalValue = currentValue
  const commit = () => {
    const nextValue = input.value.trim()
    if (nextValue === originalValue) return
    if (!saveObservation(drawer, itemIndex, nextValue)) return
    originalValue = nextValue
    input.disabled = true
    input.placeholder = 'Salvando...'
    window.setTimeout(() => window.location.reload(), 180)
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      input.blur()
    }
  })

  wrapper.append(label, input)
  info.append(wrapper)
  itemElement.dataset.observationEditor = 'true'
}

function enhanceCommandDrawer() {
  const drawer = document.querySelector('.commandDrawer')
  if (!drawer) return

  const oldGeneralObservation = drawer.querySelector('.commandObs')
  if (oldGeneralObservation) oldGeneralObservation.remove()

  drawer.querySelectorAll('.commandItem').forEach((itemElement, itemIndex) => {
    createEditor(drawer, itemElement, itemIndex)
  })
}

function reopenTableAfterReload() {
  const tableNumber = sessionStorage.getItem(REOPEN_KEY)
  if (!tableNumber) return

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    const card = Array.from(document.querySelectorAll('.restaurantTableCard')).find(element => {
      const title = element.querySelector('.tableTop strong')?.textContent || ''
      return title.includes(`Mesa ${tableNumber}`)
    })

    if (card) {
      sessionStorage.removeItem(REOPEN_KEY)
      card.click()
      window.clearInterval(timer)
      return
    }

    if (attempts > 20) {
      sessionStorage.removeItem(REOPEN_KEY)
      window.clearInterval(timer)
    }
  }, 150)
}

const observer = new MutationObserver(enhanceCommandDrawer)
observer.observe(document.documentElement, { childList: true, subtree: true })

document.addEventListener('click', () => window.setTimeout(enhanceCommandDrawer, 0), true)
window.addEventListener('DOMContentLoaded', reopenTableAfterReload)
window.setTimeout(reopenTableAfterReload, 300)
window.setTimeout(enhanceCommandDrawer, 300)
