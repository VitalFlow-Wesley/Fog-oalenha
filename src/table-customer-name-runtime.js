const TABLES_KEY = 'fogao-tables-v1'
const REOPEN_KEY = 'fogao-reopen-table-after-customer-name'

function readTables() {
  try {
    const value = JSON.parse(localStorage.getItem(TABLES_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function saveTables(tables) {
  localStorage.setItem(TABLES_KEY, JSON.stringify(tables))
  window.dispatchEvent(new Event('fogao-tables-updated'))
}

function getCurrentTableNumber(drawer) {
  const text = drawer.querySelector('.commandTitleRow h2')?.textContent || ''
  return text.match(/Mesa\s+(\d+)/i)?.[1]?.padStart(2, '0') || ''
}

function findTable(number) {
  return readTables().find(table => String(table.number || '').padStart(2, '0') === number)
}

function createModal() {
  const overlay = document.createElement('div')
  overlay.className = 'tableCustomerModalOverlay'
  overlay.hidden = true
  overlay.innerHTML = `
    <form class="tableCustomerModal" role="dialog" aria-modal="true">
      <span class="tableCustomerEyebrow">IDENTIFICAÇÃO DA MESA</span>
      <h2>Nome do cliente</h2>
      <p>Use um nome ou referência para o garçom identificar esta comanda. O número físico da mesa continuará salvo.</p>
      <label>
        <span>Cliente ou referência</span>
        <input type="text" maxlength="60" placeholder="Ex.: João, Família Silva, Aniversário" autocomplete="off" />
      </label>
      <p class="tableCustomerError" hidden></p>
      <div class="tableCustomerActions">
        <button type="button" data-action="clear">Remover nome</button>
        <button type="button" data-action="cancel">Cancelar</button>
        <button type="submit">Salvar nome</button>
      </div>
    </form>
  `
  document.body.appendChild(overlay)
  return overlay
}

let modal

function openCustomerEditor(drawer) {
  const number = getCurrentTableNumber(drawer)
  const table = findTable(number)
  if (!table) return

  modal ||= createModal()
  const input = modal.querySelector('input')
  const error = modal.querySelector('.tableCustomerError')
  input.value = table.customerName || ''
  error.hidden = true

  const close = () => {
    modal.hidden = true
    document.body.classList.remove('table-customer-modal-open')
  }

  const persist = customerName => {
    const tables = readTables().map(item => (
      String(item.number || '').padStart(2, '0') === number
        ? { ...item, customerName: customerName.trim() }
        : item
    ))
    saveTables(tables)
    sessionStorage.setItem(REOPEN_KEY, number)
    close()
    window.setTimeout(() => window.location.reload(), 120)
  }

  modal.querySelector('[data-action="cancel"]').onclick = close
  modal.querySelector('[data-action="clear"]').onclick = () => persist('')
  modal.onclick = event => {
    if (event.target === modal) close()
  }
  modal.querySelector('form').onsubmit = event => {
    event.preventDefault()
    persist(input.value)
  }

  modal.hidden = false
  document.body.classList.add('table-customer-modal-open')
  window.setTimeout(() => input.focus(), 30)
}

function enhanceDrawer() {
  const drawer = document.querySelector('.commandDrawer')
  if (!drawer) return
  const titleRow = drawer.querySelector('.commandTitleRow')
  const title = titleRow?.querySelector('h2')
  if (!titleRow || !title) return

  const number = getCurrentTableNumber(drawer)
  const table = findTable(number)
  if (!table) return

  if (table.customerName) {
    title.textContent = table.customerName
    let subtitle = titleRow.querySelector('.tableCustomerSubtitle')
    if (!subtitle) {
      subtitle = document.createElement('small')
      subtitle.className = 'tableCustomerSubtitle'
      title.insertAdjacentElement('afterend', subtitle)
    }
    subtitle.textContent = `Mesa ${table.number}`
  }

  if (!titleRow.querySelector('.tableCustomerEditBtn')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tableCustomerEditBtn'
    button.setAttribute('aria-label', 'Identificar cliente nesta mesa')
    button.title = 'Identificar cliente'
    button.textContent = '✎'
    button.onclick = event => {
      event.preventDefault()
      event.stopPropagation()
      openCustomerEditor(drawer)
    }
    titleRow.insertBefore(button, titleRow.querySelector('.commandGuestsEditor'))
  }
}

function enhanceCards() {
  const tables = readTables()
  document.querySelectorAll('.restaurantTableCard').forEach(card => {
    const title = card.querySelector('.tableTop strong')
    if (!title) return
    const number = title.textContent.match(/Mesa\s+(\d+)/i)?.[1]?.padStart(2, '0')
    const table = tables.find(item => String(item.number || '').padStart(2, '0') === number)
    if (!table?.customerName) return

    let badge = card.querySelector('.tableCustomerBadge')
    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'tableCustomerBadge'
      title.insertAdjacentElement('afterend', badge)
    }
    badge.textContent = table.customerName
  })
}

function clearNamesFromFreeTables() {
  const tables = readTables()
  let changed = false
  const normalized = tables.map(table => {
    if (table.status === 'livre' && table.customerName) {
      changed = true
      return { ...table, customerName: '' }
    }
    return table
  })
  if (changed) saveTables(normalized)
}

function reopenAfterReload() {
  const number = sessionStorage.getItem(REOPEN_KEY)
  if (!number) return
  let attempts = 0
  const timer = setInterval(() => {
    attempts += 1
    const card = Array.from(document.querySelectorAll('.restaurantTableCard')).find(element => (
      element.querySelector('.tableTop strong')?.textContent?.includes(`Mesa ${number}`)
    ))
    if (card) {
      sessionStorage.removeItem(REOPEN_KEY)
      card.click()
      clearInterval(timer)
    } else if (attempts > 20) {
      sessionStorage.removeItem(REOPEN_KEY)
      clearInterval(timer)
    }
  }, 150)
}

function enhance() {
  enhanceDrawer()
  enhanceCards()
}

const observer = new MutationObserver(enhance)
observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('fogao-tables-updated', enhance)
window.addEventListener('focus', enhance)
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && !modal.hidden) {
    modal.hidden = true
    document.body.classList.remove('table-customer-modal-open')
  }
})
setInterval(clearNamesFromFreeTables, 1200)
setTimeout(enhance, 250)
setTimeout(reopenAfterReload, 300)
