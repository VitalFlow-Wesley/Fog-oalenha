function nowPtBr() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function readTablesFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('fogao-tables-v1') || '[]')
  } catch {
    return []
  }
}

function writeTablesToStorage(tables) {
  try {
    localStorage.setItem('fogao-tables-v1', JSON.stringify(tables))
  } catch {
    // Mantém a tela funcionando caso o armazenamento esteja bloqueado.
  }
}

function ensureKitchenSentTimes() {
  const tables = readTablesFromStorage()
  if (!Array.isArray(tables) || !tables.length) return

  let changed = false
  const updated = tables.map(table => {
    if ((table.kitchenSent || table.status === 'enviado') && !table.kitchenSentAt) {
      changed = true
      return { ...table, kitchenSentAt: nowPtBr() }
    }
    return table
  })

  if (changed) writeTablesToStorage(updated)
}

function createKitchenPrintArea(orderCard) {
  const tableNumber = orderCard.querySelector('.kitchenOrderMesa strong')?.textContent?.replace('Mesa ', '').trim() || ''
  const time = orderCard.querySelector('.kitchenOrderMesa span')?.textContent?.trim() || nowPtBr()
  const items = Array.from(orderCard.querySelectorAll('.kitchenOrderContent li')).map(item => item.textContent.trim())
  const observations = Array.from(orderCard.querySelectorAll('.kitchenObs')).map(item => item.textContent.trim())

  document.querySelector('.kitchenReprintOnly')?.remove()

  const printArea = document.createElement('div')
  printArea.className = 'printOnly kitchenReprintOnly customerBillPrint'
  printArea.innerHTML = `
    <h1>PEDIDO PARA COZINHA</h1>
    <p><strong>Mesa:</strong> ${tableNumber}</p>
    <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}, ${time}</p>
    <hr />
    ${items.length ? items.map(item => `<div class="printLine"><span>${item}</span></div>`).join('') : '<p>Nenhum item para impressão.</p>'}
    ${observations.length ? `<hr />${observations.map(obs => `<p>${obs}</p>`).join('')}` : ''}
  `
  document.body.appendChild(printArea)
}

function enhanceKitchenReprint() {
  ensureKitchenSentTimes()

  document.querySelectorAll('.kitchenOrderCard').forEach(card => {
    const reprintButton = Array.from(card.querySelectorAll('button')).find(button => button.textContent.trim().includes('Reimprimir'))
    if (!reprintButton || reprintButton.dataset.reprintFixed) return

    reprintButton.dataset.reprintFixed = '1'
    reprintButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      createKitchenPrintArea(card)
      setTimeout(() => window.print(), 80)
    }, true)
  })

  document.querySelectorAll('.kitchenDetailsModal .secondaryBtn').forEach(button => {
    if (!button.textContent.trim().includes('Reimprimir') || button.dataset.reprintFixed) return
    button.dataset.reprintFixed = '1'
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const modal = button.closest('.kitchenDetailsModal')
      const tableNumber = modal?.querySelector('.drawerHeader h2')?.textContent?.replace('Mesa ', '').trim() || ''
      const time = modal?.querySelector('p')?.textContent?.replace('Pedido enviado às ', '').trim() || nowPtBr()
      const items = Array.from(modal?.querySelectorAll('.kitchenDetailsList li strong') || []).map(item => item.textContent.trim())
      const observations = Array.from(modal?.querySelectorAll('.kitchenDetailsList li small') || []).map(item => item.textContent.trim())

      document.querySelector('.kitchenReprintOnly')?.remove()
      const printArea = document.createElement('div')
      printArea.className = 'printOnly kitchenReprintOnly customerBillPrint'
      printArea.innerHTML = `
        <h1>PEDIDO PARA COZINHA</h1>
        <p><strong>Mesa:</strong> ${tableNumber}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}, ${time}</p>
        <hr />
        ${items.length ? items.map(item => `<div class="printLine"><span>${item}</span></div>`).join('') : '<p>Nenhum item para impressão.</p>'}
        ${observations.length ? `<hr />${observations.map(obs => `<p>${obs}</p>`).join('')}` : ''}
      `
      document.body.appendChild(printArea)
      setTimeout(() => window.print(), 80)
    }, true)
  })
}

const kitchenRuntimeStyle = document.createElement('style')
kitchenRuntimeStyle.textContent = `
  @media print {
    body:has(.kitchenReprintOnly) .appShell,
    body:has(.kitchenReprintOnly) .authModalOverlay {
      display: none !important;
    }

    body:has(.kitchenReprintOnly) .kitchenReprintOnly {
      display: block !important;
    }
  }
`
document.head.appendChild(kitchenRuntimeStyle)

new MutationObserver(enhanceKitchenReprint).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceKitchenReprint)
window.addEventListener('focus', enhanceKitchenReprint)
setInterval(enhanceKitchenReprint, 1200)
setTimeout(enhanceKitchenReprint, 300)
