import { saveRemoteState } from './services/appStateApi.js'

const TABLES_KEY = 'fogao-tables-v1'
const USERS_KEY = 'fogao-users-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mantem o app funcionando mesmo sem armazenamento local.
  }
}

function tableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function resetTable(table) {
  return {
    ...table,
    status: 'livre',
    guests: 0,
    openedAt: null,
    closedAt: null,
    items: [],
    kitchenSent: false,
    kitchenSentAt: null,
    kitchenWaiterName: null,
    billRequested: false,
    lastKitchenPrinter: null,
    lastCashierPrinter: null,
    mergedTableIds: [],
    mergedTableNumbers: [],
    mergedTo: undefined,
    mergedToNumber: undefined,
    previousMergeState: undefined,
  }
}

async function resetCurrentCashMovement() {
  const tables = readJson(TABLES_KEY, [])
  if (!Array.isArray(tables)) return

  const activeTables = tables.filter(table => table.status !== 'livre' || tableTotal(table) > 0 || Number(table.guests || 0) > 0)
  const closingRecord = {
    id: `closing-${Date.now()}`,
    closedAt: new Date().toISOString(),
    total: activeTables.reduce((sum, table) => sum + tableTotal(table), 0),
    tables: activeTables,
  }
  const resetTables = tables.map(resetTable)
  const closings = readJson(CLOSINGS_KEY, [])

  writeJson(CLOSINGS_KEY, [closingRecord, ...closings].slice(0, 60))
  writeJson(TABLES_KEY, resetTables)

  try {
    await saveRemoteState({
      users: readJson(USERS_KEY, []),
      tables: resetTables,
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
    })
  } catch (error) {
    console.warn('Fechamento salvo localmente. Sincronizacao remota pendente:', error.message)
  }
}

if (!window.__fogaoClosingResetInstalled) {
  window.__fogaoClosingResetInstalled = true
  const nativeConfirm = window.confirm.bind(window)

  window.confirm = message => {
    const approved = nativeConfirm(message)
    const text = String(message || '').toLowerCase()
    const isCashClosing = text.includes('fechar o caixa') || text.includes('caixa do dia')

    if (approved && isCashClosing) {
      window.setTimeout(async () => {
        await resetCurrentCashMovement()
        window.alert('Caixa fechado com sucesso. Novo caixa iniciado.')
        window.location.reload()
      }, 250)
    }

    return approved
  }
}
