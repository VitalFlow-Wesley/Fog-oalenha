import './kitchen-modal-lock.js'

const TABLES_KEY = 'fogao-tables-v1'

function readTables() {
  try {
    const tables = JSON.parse(localStorage.getItem(TABLES_KEY) || '[]')
    return Array.isArray(tables) ? tables : []
  } catch {
    return []
  }
}

function normalizeTableNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || String(value || '').trim()
}

function getPrintedTableNumber(printArea) {
  const mesaLine = [...printArea.querySelectorAll(':scope > p')].find(p => /^\s*Mesa\s*:/i.test(p.textContent || ''))
  if (!mesaLine) return ''
  return normalizeTableNumber((mesaLine.textContent || '').replace(/Mesa\s*:/i, '').split('+')[0])
}

function getGuestsForPrint(printArea) {
  const printedTableNumber = getPrintedTableNumber(printArea)
  if (!printedTableNumber) return 0

  const table = readTables().find(item => normalizeTableNumber(item.number) === printedTableNumber || normalizeTableNumber(item.id) === printedTableNumber)
  return Math.max(1, Number(table?.peopleCount ?? table?.guests ?? 1) || 1)
}

function normalizeGuestsInKitchenPrint() {
  document.querySelectorAll('.printOnly.customerBillPrint').forEach(printArea => {
    const title = printArea.querySelector('h1')?.textContent || ''
    if (!/PEDIDO PARA COZINHA/i.test(title)) return

    const directParagraphs = [...printArea.querySelectorAll(':scope > p')]
    const mesaLine = directParagraphs.find(p => /^\s*Mesa\s*:/i.test(p.textContent || ''))
    if (!mesaLine) return

    const guests = getGuestsForPrint(printArea)
    const desiredHtml = `<strong>Pessoas:</strong> ${guests}`
    const guestsLines = directParagraphs.filter(p => /^\s*Pessoas\s*:/i.test(p.textContent || ''))

    let guestsLine = guestsLines[0]
    guestsLines.slice(1).forEach(line => line.remove())

    if (!guestsLine) {
      guestsLine = document.createElement('p')
      guestsLine.className = 'printGuestsLine'
    }

    if (guestsLine.innerHTML !== desiredHtml) guestsLine.innerHTML = desiredHtml

    if (mesaLine.nextElementSibling !== guestsLine) {
      mesaLine.insertAdjacentElement('afterend', guestsLine)
    }
  })
}

let scheduled = false
function scheduleNormalize() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    normalizeGuestsInKitchenPrint()
  })
}

if (!window.__fogaoKitchenPrintGuestsFixInstalled) {
  window.__fogaoKitchenPrintGuestsFixInstalled = true
  window.addEventListener('beforeprint', normalizeGuestsInKitchenPrint)
  window.addEventListener('DOMContentLoaded', scheduleNormalize)
  window.addEventListener('fogao-tables-updated', scheduleNormalize)
  window.addEventListener('storage', event => {
    if (event.key === TABLES_KEY) scheduleNormalize()
  })
  new MutationObserver(scheduleNormalize).observe(document.body, { childList: true, subtree: true })
  setTimeout(scheduleNormalize, 250)
}
