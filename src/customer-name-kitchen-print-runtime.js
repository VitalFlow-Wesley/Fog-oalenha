const TABLES_KEY = 'fogao-tables-v1'

function readTables() {
  try {
    const value = JSON.parse(localStorage.getItem(TABLES_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function tableNumberFromText(text = '') {
  return text.match(/Mesa\s*:?\s*(\d+)/i)?.[1]?.padStart(2, '0') || ''
}

function findTable(number) {
  if (!number) return null
  return readTables().find(table => String(table.number || '').padStart(2, '0') === number) || null
}

function customerNameForText(text) {
  const table = findTable(tableNumberFromText(text))
  return String(table?.customerName || '').trim()
}

function enhanceKitchenCards() {
  document.querySelectorAll('.kitchenOrderCard').forEach(card => {
    const mesaBlock = card.querySelector('.kitchenOrderMesa')
    const title = mesaBlock?.querySelector('strong')
    if (!mesaBlock || !title) return

    const customerName = customerNameForText(title.textContent)
    let customer = mesaBlock.querySelector('.kitchenCustomerName')

    if (!customerName) {
      customer?.remove()
      return
    }

    if (!customer) {
      customer = document.createElement('small')
      customer.className = 'kitchenCustomerName'
      title.insertAdjacentElement('afterend', customer)
    }
    customer.textContent = customerName
  })
}

function enhanceKitchenDetails() {
  document.querySelectorAll('.kitchenDetailsModal').forEach(modal => {
    const heading = modal.querySelector('.drawerHeader h2')
    if (!heading) return

    const customerName = customerNameForText(heading.textContent)
    let customer = modal.querySelector('.kitchenDetailsCustomer')

    if (!customerName) {
      customer?.remove()
      return
    }

    if (!customer) {
      customer = document.createElement('p')
      customer.className = 'kitchenDetailsCustomer'
      heading.insertAdjacentElement('afterend', customer)
    }
    customer.textContent = `Cliente: ${customerName}`
  })
}

function enhanceLastOrder() {
  document.querySelectorAll('.lastOrderBox strong').forEach(label => {
    const customerName = customerNameForText(label.textContent)
    let customer = label.parentElement?.querySelector('.lastOrderCustomer')

    if (!customerName) {
      customer?.remove()
      return
    }

    if (!customer) {
      customer = document.createElement('small')
      customer.className = 'lastOrderCustomer'
      label.insertAdjacentElement('afterend', customer)
    }
    customer.textContent = customerName
  })
}

function enhancePrintBlocks() {
  document.querySelectorAll('.customerBillPrint').forEach(printBlock => {
    const paragraphs = Array.from(printBlock.querySelectorAll(':scope > p'))
    const mesaParagraph = paragraphs.find(paragraph => /Mesa\s*:/i.test(paragraph.textContent))
    if (!mesaParagraph) return

    const customerName = customerNameForText(mesaParagraph.textContent)
    let customerParagraph = printBlock.querySelector('.printCustomerName')

    if (!customerName) {
      customerParagraph?.remove()
      return
    }

    if (!customerParagraph) {
      customerParagraph = document.createElement('p')
      customerParagraph.className = 'printCustomerName'
      mesaParagraph.insertAdjacentElement('afterend', customerParagraph)
    }
    customerParagraph.innerHTML = `<strong>Cliente:</strong> ${customerName}`
  })
}

function enhanceAll() {
  enhanceKitchenCards()
  enhanceKitchenDetails()
  enhanceLastOrder()
  enhancePrintBlocks()
}

let scheduled = false
function scheduleEnhance() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    enhanceAll()
  })
}

const observer = new MutationObserver(scheduleEnhance)
observer.observe(document.documentElement, { childList: true, subtree: true })

window.addEventListener('fogao-tables-updated', scheduleEnhance)
window.addEventListener('focus', scheduleEnhance)
window.addEventListener('beforeprint', enhancePrintBlocks)
window.addEventListener('storage', event => {
  if (event.key === TABLES_KEY) scheduleEnhance()
})

setTimeout(scheduleEnhance, 250)
