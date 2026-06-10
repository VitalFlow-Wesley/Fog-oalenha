const SALES_KEY = 'fogao-sales-history-v1'

function formatDateBR(value) {
  if (!value) return 'Hoje'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return 'Hoje'
  const today = new Date()
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (value === todayValue) return 'Hoje'
  return `${day}/${month}/${year}`
}

function getTodayValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getItemSector(item) {
  const category = String(item.category || '').toLowerCase()
  const local = String(item.localSaida || item.sector || '').toLowerCase()
  if (category.includes('churrasco') || local.includes('churrasco')) return 'Churrasco'
  if (category.includes('suco') || local.includes('suco')) return 'Sucos'
  if (category.includes('bebida') || category.includes('bombom') || category.includes('salgadinho') || category.includes('sorvete') || category.includes('sobremesa') || local.includes('bar')) return 'Bar'
  return 'Cozinha'
}

function getHistoryForDate(date) {
  const history = readJson(SALES_KEY, [])
  return Array.isArray(history) ? history.filter(record => record.date === date) : []
}

async function loadRemoteHistory() {
  try {
    const response = await fetch('/api/state', { method: 'GET' })
    const remote = response.ok ? await response.json() : {}
    if (Array.isArray(remote.salesHistory)) {
      localStorage.setItem(SALES_KEY, JSON.stringify(remote.salesHistory))
    }
  } catch {
    // Usa o histórico local se o servidor estiver indisponível.
  }
}

function buildReportFromHistory(records = []) {
  const items = records.flatMap(record => (record.items || []).map(item => ({
    ...item,
    tableNumber: record.tableNumber,
    waiterName: record.waiterName || 'Sem garçom',
    sector: getItemSector(item),
  })))
  const total = records.reduce((sum, record) => sum + Number(record.total || 0), 0)
  const ordersQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const tablesCount = new Set(records.map(record => record.tableNumber)).size
  const ticket = tablesCount ? total / tablesCount : 0

  const productMap = new Map()
  items.forEach(item => {
    const key = item.name || 'Produto'
    const current = productMap.get(key) || { name: key, qty: 0, total: 0, sector: item.sector }
    current.qty += Number(item.qty || 0)
    current.total += Number(item.price || 0) * Number(item.qty || 0)
    productMap.set(key, current)
  })

  const products = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty || b.total - a.total)
  const sectors = ['Cozinha', 'Churrasco', 'Sucos', 'Bar'].map(name => {
    const sectorItems = items.filter(item => item.sector === name)
    return {
      name,
      qty: sectorItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      total: sectorItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    }
  })

  return { records, items, total, ordersQty, tablesCount, ticket, products, sectors }
}

function setText(element, value) {
  if (element) element.textContent = value
}

function updateReportsDom(date) {
  const page = document.querySelector('.reportsPremiumPage')
  if (!page) return

  const selectedLabel = formatDateBR(date)
  const report = buildReportFromHistory(getHistoryForDate(date))
  const hasHistory = report.records.length > 0

  const cards = page.querySelectorAll('.reportsSummaryGrid.simpleSummaryGrid .reportSummaryCard, .reportsSummaryGrid.completeSummaryGrid .reportSummaryCard')
  if (cards[0]) {
    setText(cards[0].querySelector('strong'), hasHistory ? money(report.total) : money(0))
    setText(cards[0].querySelector('small'), hasHistory ? `Movimentação de ${selectedLabel}` : `Sem histórico em ${selectedLabel}`)
  }
  if (cards[1]) {
    setText(cards[1].querySelector('strong'), hasHistory ? String(report.ordersQty) : '0')
    setText(cards[1].querySelector('small'), 'Itens vendidos no período')
  }
  if (cards[2]) {
    setText(cards[2].querySelector('strong'), hasHistory ? String(report.tablesCount) : '0')
    setText(cards[2].querySelector('small'), 'Mesas fechadas no período')
  }
  if (cards[3]) {
    setText(cards[3].querySelector('strong'), hasHistory ? money(report.ticket) : money(0))
    setText(cards[3].querySelector('small'), 'Por mesa atendida')
  }

  page.querySelectorAll('.simpleSectorCard').forEach(card => {
    const name = card.querySelector('strong')?.textContent?.trim()
    const sector = report.sectors.find(item => item.name === name)
    if (!sector) return
    setText(card.querySelector('span'), `${sector.qty} itens`)
    setText(card.querySelector('b'), money(sector.total))
  })

  const table = page.querySelector('.simpleProductsTable')
  if (table) {
    const head = table.querySelector('.premiumReportRow.head')?.outerHTML || '<div class="premiumReportRow head"><span>Produto</span><span>Qtd</span><span>Setor</span><span>Total</span></div>'
    const rows = report.products.slice(0, 5).map(item => `<div class="premiumReportRow"><span>${item.name}</span><span>${item.qty}</span><span><em>${item.sector || '-'}</em></span><span>${money(item.total)}</span></div>`).join('')
    table.innerHTML = rows ? `${head}${rows}` : `${head}<div class="premiumReportRow"><span>Nenhum produto vendido nessa data</span><span>0</span><span><em>-</em></span><span>${money(0)}</span></div>`
  }

  const resumeRows = page.querySelectorAll('.reportResumeList > div')
  if (resumeRows[0]) setText(resumeRows[0].querySelector('strong'), hasHistory ? money(report.total) : money(0))
  if (resumeRows[1]) setText(resumeRows[1].querySelector('strong'), hasHistory ? String(report.ordersQty) : '0')
  report.sectors.forEach((sector, index) => {
    const row = resumeRows[index + 2]
    if (row) setText(row.querySelector('strong'), String(sector.qty))
  })
  const lastRow = resumeRows[resumeRows.length - 1]
  if (lastRow) setText(lastRow.querySelector('strong'), hasHistory ? String(report.tablesCount) : '0')

  const livePill = page.querySelector('.liveDataPill')
  if (livePill) {
    livePill.textContent = hasHistory
      ? `Movimentação carregada de ${selectedLabel}`
      : `Nenhuma movimentação salva em ${selectedLabel}`
  }
}

function ensureCalendarStyle() {
  if (document.getElementById('fogao-reports-calendar-style')) return
  const style = document.createElement('style')
  style.id = 'fogao-reports-calendar-style'
  style.textContent = `
    .reportCalendarPickerBtn { position: relative !important; overflow: hidden !important; cursor: pointer !important; min-width: 150px !important; }
    .reportCalendarPickerBtn .reportCalendarLabel { position: relative !important; z-index: 1 !important; pointer-events: none !important; white-space: nowrap !important; }
    .reportCalendarPickerBtn .reportCalendarInput { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; opacity: 0 !important; border: 0 !important; padding: 0 !important; margin: 0 !important; cursor: pointer !important; z-index: 2 !important; color: transparent !important; background: transparent !important; }
    .reportCalendarPickerBtn .reportCalendarInput::-webkit-calendar-picker-indicator { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; opacity: 0 !important; cursor: pointer !important; }
    .reportsActions .reportCalendarPickerBtn svg { position: relative !important; z-index: 1 !important; pointer-events: none !important; flex: 0 0 auto !important; }
    @media (max-width: 760px) { .reportCalendarPickerBtn { width: 100% !important; min-width: 0 !important; } }
  `
  document.head.appendChild(style)
}

async function notifyReportDate(value) {
  const label = formatDateBR(value)
  localStorage.setItem('fogao-reports-date', value)
  localStorage.setItem('fogao-reports-date-label', label)
  await loadRemoteHistory()
  updateReportsDom(value)
}

function enhanceReportsCalendar() {
  ensureCalendarStyle()
  const reportsPage = document.querySelector('.reportsPremiumPage')
  if (!reportsPage) return

  const calendarButton = Array.from(reportsPage.querySelectorAll('.reportsActions .reportActionBtn'))
    .find(button => button.textContent.trim().includes('Hoje') || /\d{2}\/\d{2}\/\d{4}/.test(button.textContent))

  if (!calendarButton || calendarButton.dataset.calendarRuntime === '1') return
  calendarButton.dataset.calendarRuntime = '1'
  calendarButton.classList.add('reportCalendarPickerBtn')
  calendarButton.type = 'button'

  const labelSpan = document.createElement('span')
  labelSpan.className = 'reportCalendarLabel'
  labelSpan.textContent = localStorage.getItem('fogao-reports-date-label') || 'Hoje'

  const input = document.createElement('input')
  input.type = 'date'
  input.className = 'reportCalendarInput'
  input.value = localStorage.getItem('fogao-reports-date') || getTodayValue()
  input.setAttribute('aria-label', 'Selecionar data do relatório')
  input.tabIndex = -1

  const icon = calendarButton.querySelector('svg')
  calendarButton.innerHTML = ''
  if (icon) calendarButton.appendChild(icon)
  calendarButton.appendChild(labelSpan)
  calendarButton.appendChild(input)

  function openPicker() {
    try {
      if (typeof input.showPicker === 'function') input.showPicker()
      else input.click()
    } catch {
      input.click()
    }
  }

  calendarButton.addEventListener('click', event => {
    if (event.target === input) return
    event.preventDefault()
    openPicker()
  })

  input.addEventListener('change', async () => {
    const label = formatDateBR(input.value)
    labelSpan.textContent = label
    await notifyReportDate(input.value)
  })

  loadRemoteHistory().then(() => updateReportsDom(input.value))
}

if (!window.__fogaoReportsCalendarRuntimeInstalled) {
  window.__fogaoReportsCalendarRuntimeInstalled = true
  window.addEventListener('DOMContentLoaded', enhanceReportsCalendar)
  window.addEventListener('focus', enhanceReportsCalendar)
  window.addEventListener('fogao-sales-history-updated', () => updateReportsDom(localStorage.getItem('fogao-reports-date') || getTodayValue()))
  new MutationObserver(enhanceReportsCalendar).observe(document.body, { childList: true, subtree: true })
  setTimeout(enhanceReportsCalendar, 300)
}