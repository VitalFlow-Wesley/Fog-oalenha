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
  const mesaLine = [...printArea.querySelectorAll('p')].find(p => /Mesa:/i.test(p.textContent || ''))
  if (!mesaLine) return ''
  return normalizeTableNumber((mesaLine.textContent || '').replace(/Mesa:/i, '').split('+')[0])
}

function getGuestsForPrint(printArea) {
  const printedTableNumber = getPrintedTableNumber(printArea)
  if (!printedTableNumber) return 0

  const table = readTables().find(item => normalizeTableNumber(item.number) === printedTableNumber || normalizeTableNumber(item.id) === printedTableNumber)
  return Number(table?.guests || 0)
}

function addGuestsToKitchenPrint() {
  document.querySelectorAll('.printOnly.customerBillPrint').forEach(printArea => {
    const title = printArea.querySelector('h1')?.textContent || ''
    if (!/PEDIDO PARA COZINHA/i.test(title)) return
    if (printArea.dataset.guestsPrintFixed === '1') return

    const mesaLine = [...printArea.querySelectorAll('p')].find(p => /Mesa:/i.test(p.textContent || ''))
    if (!mesaLine) return

    const guests = getGuestsForPrint(printArea)
    const guestsLine = document.createElement('p')
    guestsLine.className = 'printGuestsLine'
    guestsLine.innerHTML = `<strong>Pessoas:</strong> ${guests || '-'}${guests ? ' pessoa(s)' : ''}`

    mesaLine.insertAdjacentElement('afterend', guestsLine)
    printArea.dataset.guestsPrintFixed = '1'
  })
}

if (!window.__fogaoKitchenPrintGuestsFixInstalled) {
  window.__fogaoKitchenPrintGuestsFixInstalled = true
  window.addEventListener('beforeprint', addGuestsToKitchenPrint)
  window.addEventListener('DOMContentLoaded', addGuestsToKitchenPrint)
  new MutationObserver(addGuestsToKitchenPrint).observe(document.body, { childList: true, subtree: true })
  setInterval(addGuestsToKitchenPrint, 400)
}
