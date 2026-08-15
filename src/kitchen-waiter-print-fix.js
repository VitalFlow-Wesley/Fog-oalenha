function readTablesForWaiter() {
  try {
    return JSON.parse(localStorage.getItem('fogao-tables-v1') || '[]')
  } catch {
    return []
  }
}

function extractPrintedTableNumber(printArea) {
  const mesaLine = Array.from(printArea.querySelectorAll('p')).find(line => line.textContent.includes('Mesa:'))
  return mesaLine?.textContent.replace('Mesa:', '').trim().split('+')[0].trim() || ''
}

function getWaiterForPrintedOrder(printArea) {
  const tableNumber = extractPrintedTableNumber(printArea)
  const tables = readTablesForWaiter()
  const table = tables.find(item => String(item.number).padStart(2, '0') === String(tableNumber).padStart(2, '0'))
  return table?.kitchenWaiterName || table?.waiterName || 'Não identificado'
}

function ensureKitchenWaiterOnPrint() {
  document.querySelectorAll('.printOnly.customerBillPrint').forEach(printArea => {
    const title = printArea.querySelector('h1')?.textContent || ''
    if (!title.includes('PEDIDO PARA COZINHA')) return

    const hasWaiter = Array.from(printArea.querySelectorAll('p')).some(line => line.textContent.includes('Garçom'))
    if (hasWaiter) return

    const waiter = getWaiterForPrintedOrder(printArea)
    const line = document.createElement('p')
    line.className = 'kitchenPrintedWaiterLine'
    line.innerHTML = `<strong>Garçom do pedido:</strong> ${waiter}`
    printArea.querySelector('h1')?.insertAdjacentElement('afterend', line)
  })
}

window.addEventListener('beforeprint', ensureKitchenWaiterOnPrint)
new MutationObserver(ensureKitchenWaiterOnPrint).observe(document.body, { childList: true, subtree: true })
setTimeout(ensureKitchenWaiterOnPrint, 300)
