import { saveRemoteState } from './services/appStateApi.js'

const SETTINGS_KEY = 'fogao-settings-v1'
const MIGRATION_KEY = 'fogao-printers-cleared-v3'
const KEYS = {
  users: 'fogao-users-v1', tables: 'fogao-tables-v1', products: 'fogao-products-v1',
  salesHistory: 'fogao-sales-history-v1', closings: 'fogao-closings-v1',
  closedTablesHistory: 'fogao-closed-tables-v1',
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function settings() { return read(SETTINGS_KEY, {}) }

async function save(next) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('fogao-settings-force-update', { detail: next }))
  try {
    await saveRemoteState({
      users: read(KEYS.users, []), tables: read(KEYS.tables, []), settings: next,
      products: read(KEYS.products, []), salesHistory: read(KEYS.salesHistory, []),
      closings: read(KEYS.closings, []), closedTablesHistory: read(KEYS.closedTablesHistory, []),
    })
  } catch (error) { console.warn('Sincronização pendente:', error.message) }
}

function empty(next = settings()) {
  return { ...next, printers: [], cashierPrinterId: '', kitchenPrinterId: '', grillPrinterId: '', juicePrinterId: '' }
}

let migrationActive = localStorage.getItem(MIGRATION_KEY) !== '1'

async function forceClearPrinters() {
  const next = empty()
  migrationActive = true
  await save(next)
  render()
}

if (migrationActive) {
  forceClearPrinters()
  window.setTimeout(forceClearPrinters, 700)
  window.setTimeout(forceClearPrinters, 1800)
  window.setTimeout(async () => {
    await forceClearPrinters()
    localStorage.setItem(MIGRATION_KEY, '1')
    migrationActive = false
    render()
  }, 3200)
}

async function addPrinter() {
  const name = window.prompt('Nome da nova impressora:', 'Nova impressora')?.trim()
  if (!name) return
  const current = settings()
  const printers = Array.isArray(current.printers) ? current.printers : []
  const printer = { id: `printer-${Date.now()}`, label: `Impressora ${printers.length + 1}`, name }
  const nextPrinters = [...printers, printer]
  const first = nextPrinters[0].id
  await save({ ...current, printers: nextPrinters, cashierPrinterId: current.cashierPrinterId || first, kitchenPrinterId: current.kitchenPrinterId || first, grillPrinterId: current.grillPrinterId || first, juicePrinterId: current.juicePrinterId || first })
  window.location.reload()
}

function findPrinter(name) {
  return (settings().printers || []).find(item => (item.name || item.label) === name)
}

async function editPrinter(name) {
  const current = settings()
  const printer = findPrinter(name)
  if (!printer) return window.alert('Nenhuma impressora vinculada.')
  const newName = window.prompt('Novo nome da impressora:', printer.name || printer.label)?.trim()
  if (!newName) return
  await save({ ...current, printers: current.printers.map(item => item.id === printer.id ? { ...item, name: newName } : item) })
  window.location.reload()
}

async function deletePrinter(name) {
  const current = settings()
  const printer = findPrinter(name)
  if (!printer || !window.confirm(`Excluir ${printer.name || printer.label}?`)) return
  const printers = current.printers.filter(item => item.id !== printer.id)
  const fallback = printers[0]?.id || ''
  const nextId = value => value === printer.id ? fallback : value
  await save({ ...current, printers, cashierPrinterId: nextId(current.cashierPrinterId), kitchenPrinterId: nextId(current.kitchenPrinterId), grillPrinterId: nextId(current.grillPrinterId), juicePrinterId: nextId(current.juicePrinterId) })
  window.location.reload()
}

function testPrinter(name) {
  if (!name || name === 'Não definida') return window.alert('Cadastre uma impressora antes de testar.')
  window.alert(`Teste enviado para ${name}.`)
  window.print()
}

async function editReceipt() {
  const current = settings()
  const message = window.prompt('Mensagem final da comanda:', current.receiptMessage || 'Obrigado pela preferência!')
  if (message === null) return
  await save({ ...current, receiptMessage: message.trim() })
  window.location.reload()
}

function render() {
  const tab = document.querySelector('.printSettingsTab')
  if (!tab) return
  const printers = migrationActive ? [] : (settings().printers || [])
  const table = tab.querySelector('.printerTableV2')
  if (!table) return
  const rows = [...table.querySelectorAll('.printerTableRow')]
  let notice = table.querySelector('.printerRuntimeEmpty')

  if (!printers.length) {
    rows.forEach(row => { row.style.display = 'none' })
    if (!notice) {
      notice = document.createElement('div')
      notice.className = 'printerRuntimeEmpty'
      notice.textContent = 'Nenhuma impressora cadastrada. Clique em Adicionar impressora.'
      table.appendChild(notice)
    }
    tab.querySelectorAll('.printRulesSelects select').forEach(select => {
      select.innerHTML = '<option value="">Nenhuma impressora cadastrada</option>'
      select.value = ''
      select.disabled = true
    })
  } else {
    rows.forEach(row => { row.style.display = '' })
    notice?.remove()
    tab.querySelectorAll('.printRulesSelects select').forEach(select => { select.disabled = false })
  }
}

function click(event) {
  if (!event.target.closest('.printSettingsTab')) return
  const add = event.target.closest('.addPrinterBtn')
  if (add) { event.preventDefault(); event.stopImmediatePropagation(); addPrinter(); return }
  const receipt = event.target.closest('.editReceiptBtn')
  if (receipt) { event.preventDefault(); event.stopImmediatePropagation(); editReceipt(); return }
  const button = event.target.closest('.printerTableActions button')
  if (!button) return
  event.preventDefault(); event.stopImmediatePropagation()
  const row = button.closest('.printerTableRow')
  const name = row?.querySelector('strong')?.textContent?.trim() || ''
  const index = [...row.querySelectorAll('.printerTableActions button')].indexOf(button)
  if (index === 0) testPrinter(name)
  if (index === 1) editPrinter(name)
  if (index === 2) deletePrinter(name)
}

document.addEventListener('click', click, true)
new MutationObserver(render).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', render)
window.addEventListener('storage', render)
window.setInterval(render, 500)
