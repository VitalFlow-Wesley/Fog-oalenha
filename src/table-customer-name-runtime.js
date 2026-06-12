const TABLES_KEY = 'fogao-tables-v1'
const initializedProductDrawers = new WeakSet()

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
  const subtitle = drawer.querySelector('.tableCustomerSubtitle')?.textContent || ''
  const title = drawer.querySelector('.commandTitleRow h2')?.textContent || ''
  const source = `${subtitle} ${title}`
  return source.match(/Mesa\s+(\d+)/i)?.[1]?.padStart(2, '0') || ''
}

function findTable(number) {
  return readTables().find(table => String(table.number || '').padStart(2, '0') === number)
}

function createModal() {
  const overlay = document.createElement('div')
  overlay.className = 'tableCustomerModalOverlay'
  overlay.hidden = true
  overlay.innerHTML = `
    <form class="tableCustomerModal" role="dialog" aria-modal="true" novalidate>
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
        <button type="submit" data-action="save">Salvar nome</button>
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
  const form = modal.querySelector('form')
  const input = modal.querySelector('input')
  const error = modal.querySelector('.tableCustomerError')
  const saveButton = modal.querySelector('[data-action="save"]')
  const clearButton = modal.querySelector('[data-action="clear"]')
  const cancelButton = modal.querySelector('[data-action="cancel"]')

  input.value = table.customerName || ''
  error.hidden = true
  saveButton.disabled = false
  saveButton.textContent = 'Salvar nome'

  const close = () => {
    modal.hidden = true
    document.body.classList.remove('table-customer-modal-open')
  }

  const persist = customerName => {
    const cleanName = String(customerName || '').trim()
    const tables = readTables()
    let changed = false
    const nextTables = tables.map(item => {
      if (String(item.number || '').padStart(2, '0') !== number) return item
      changed = true
      return { ...item, customerName: cleanName }
    })

    if (!changed) {
      error.textContent = 'Não foi possível localizar esta mesa. Feche a comanda e abra novamente.'
      error.hidden = false
      return
    }

    try {
      saveButton.disabled = true
      saveButton.textContent = 'Salvando...'
      saveTables(nextTables)
      close()
      window.setTimeout(scheduleEnhance, 40)
    } catch {
      saveButton.disabled = false
      saveButton.textContent = 'Salvar nome'
      error.textContent = 'Não foi possível salvar o nome. Tente novamente.'
      error.hidden = false
    }
  }

  cancelButton.onclick = close
  clearButton.onclick = () => persist('')
  form.onsubmit = event => {
    event.preventDefault()
    persist(input.value)
  }
  modal.onclick = event => {
    if (event.target === modal) close()
  }

  modal.hidden = false
  document.body.classList.add('table-customer-modal-open')
  window.setTimeout(() => input.focus(), 30)
}

function selectDefaultProductCategory(drawer) {
  if (initializedProductDrawers.has(drawer)) return
  const tabs = [...drawer.querySelectorAll('.commandCategoryTabs button')]
  if (!tabs.length) return

  const mealsButton = tabs.find(button => button.textContent?.trim() === 'Refeições')
  if (!mealsButton) return

  initializedProductDrawers.add(drawer)
  if (!mealsButton.classList.contains('active')) mealsButton.click()
}

function enhanceDrawer() {
  const drawer = document.querySelector('.commandDrawer')
  if (!drawer) return
  selectDefaultProductCategory(drawer)
  const titleRow = drawer.querySelector('.commandTitleRow')
  const title = titleRow?.querySelector('h2')
  if (!titleRow || !title) return

  const number = getCurrentTableNumber(drawer)
  const table = findTable(number)
  if (!table) return

  let subtitle = titleRow.querySelector('.tableCustomerSubtitle')
  if (table.customerName) {
    if (title.textContent !== table.customerName) title.textContent = table.customerName
    if (!subtitle) {
      subtitle = document.createElement('small')
      subtitle.className = 'tableCustomerSubtitle'
      title.insertAdjacentElement('afterend', subtitle)
    }
    const subtitleText = `Mesa ${table.number}`
    if (subtitle.textContent !== subtitleText) subtitle.textContent = subtitleText
  } else {
    const defaultTitle = `Mesa ${table.number}${table.mergedTableNumbers?.length ? ` + ${table.mergedTableNumbers.join(' + ')}` : ''}`
    if (title.textContent !== defaultTitle) title.textContent = defaultTitle
    subtitle?.remove()
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
    const guestsEditor = titleRow.querySelector('.commandGuestsEditor')
    titleRow.insertBefore(button, guestsEditor || null)
  }
}

function enhanceCards() {
  const tables = readTables()
  document.querySelectorAll('.restaurantTableCard').forEach(card => {
    const title = card.querySelector('.tableTop strong')
    if (!title) return
    const number = title.textContent.match(/Mesa\s+(\d+)/i)?.[1]?.padStart(2, '0')
    const table = tables.find(item => String(item.number || '').padStart(2, '0') === number)
    let badge = card.querySelector('.tableCustomerBadge')

    if (!table?.customerName) {
      badge?.remove()
      return
    }

    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'tableCustomerBadge'
      title.insertAdjacentElement('afterend', badge)
    }
    if (badge.textContent !== table.customerName) badge.textContent = table.customerName
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

function enhance() {
  enhanceDrawer()
  enhanceCards()
}

let enhanceScheduled = false
function scheduleEnhance() {
  if (enhanceScheduled) return
  enhanceScheduled = true
  window.requestAnimationFrame(() => {
    enhanceScheduled = false
    enhance()
  })
}

const observer = new MutationObserver(scheduleEnhance)
observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('fogao-tables-updated', scheduleEnhance)
window.addEventListener('focus', scheduleEnhance)
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && !modal.hidden) {
    modal.hidden = true
    document.body.classList.remove('table-customer-modal-open')
  }
})
setInterval(clearNamesFromFreeTables, 2500)
setTimeout(scheduleEnhance, 250)
