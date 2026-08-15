import {
  allowCors,
  getDb,
  parseBody,
  readAppState,
  readCollectionState,
  syncModelCollections,
  updateAppState,
} from '../lib/mongo.js'
import { readManagerApproval, requireUser } from '../lib/auth.js'

const modelKeys = ['users', 'products', 'tables']
const allowedKeys = ['users', 'tables', 'settings', 'products', 'salesHistory', 'closings', 'closedTablesHistory', 'removedTableIds']
const waiterSettingKeys = [
  'establishmentName',
  'printers',
  'kitchenPrinterId',
  'cashierPrinterId',
  'grillPrinterId',
  'juicePrinterId',
  'printKitchenItems',
  'printBarItems',
  'printFullReceipt',
  'allowReprint',
  'receiptMessage',
]

// Mongo writes for a table snapshot need a very small critical section. Without
// it, two requests can both read the same old snapshot before either one writes.
let tableWriteQueue = Promise.resolve()

function serializeTableWrite(work) {
  const result = tableWriteQueue.then(work, work)
  tableWriteQueue = result.catch(() => {})
  return result
}

function waiterSettings(settings = {}) {
  return {
    ...Object.fromEntries(waiterSettingKeys.filter(key => key in settings).map(key => [key, settings[key]])),
    cancelPassword: null,
    cancelUpdatedBy: null,
  }
}

function tableKey(table) {
  if (!table || typeof table !== 'object') return null
  if (table.id !== undefined && table.id !== null && table.id !== '') return `id:${table.id}`
  if (table.number !== undefined && table.number !== null && table.number !== '') return `number:${String(table.number).trim()}`
  return null
}

function itemKey(item) {
  if (!item || typeof item !== 'object') return null
  if (item.lineId) return `line:${item.lineId}`
  return `item:${item.id || ''}|${item.observation || ''}|${item.originTable || ''}|${item.launchedByName || item.waiterName || ''}`
}

// The UI saves a complete table snapshot.  Two waiters can therefore have an
// older copy of the same table in separate browsers.  Merge line items here so
// a later save cannot silently discard an item just added by somebody else.
function closedTableKeys(records = []) {
  return new Set(
    (Array.isArray(records) ? records : [])
      .map(record => {
        if (!record || typeof record !== 'object') return null
        if (record.tableId !== undefined && record.tableId !== null && record.tableId !== '') return `id:${record.tableId}`
        if (record.tableNumber !== undefined && record.tableNumber !== null && record.tableNumber !== '') return `number:${String(record.tableNumber).trim()}`
        return null
      })
      .filter(Boolean)
  )
}

function mergeConcurrentTables(existingTables = [], incomingTables = [], session, removedTableIds = [], closedTablesHistory = []) {
  const existingByKey = new Map(existingTables.map(table => [tableKey(table), table]).filter(([key]) => key))
  const removedTableKeys = new Set((Array.isArray(removedTableIds) ? removedTableIds : []).map(id => `id:${id}`))
  // Closed tables are tombstoned in the history. This blocks a delayed save
  // from an old browser from re-opening a table after it was closed elsewhere.
  const closedKeys = closedTableKeys(closedTablesHistory)
  const activeIncomingTables = incomingTables.filter(table => {
    const key = tableKey(table)
    return !removedTableKeys.has(key) && !closedKeys.has(key)
  })
  const incomingKeys = new Set(activeIncomingTables.map(tableKey).filter(Boolean))
  const merged = activeIncomingTables.map(incoming => {
    const current = existingByKey.get(tableKey(incoming))
    if (!current) return incoming

    const incomingItems = Array.isArray(incoming.items) ? incoming.items : []
    // A completed table is intentionally cleared; it is not a stale snapshot.
    const approval = readManagerApproval(incoming.removalApproval?.token)
    const hasManagerApproval = session.role !== 'garcom' || Boolean(approval)
    if (incoming.status === 'livre') {
      if (!hasManagerApproval && Array.isArray(current.items) && current.items.length) {
        const { status, ...withoutClear } = incoming
        return { ...current, ...withoutClear, items: current.items }
      }
      return { ...current, ...incoming, items: incomingItems }
    }

    const explicitlyRemoved = new Set(Array.isArray(incoming.removedItemIds) ? incoming.removedItemIds : [])
    const incomingItemKeys = new Set(incomingItems.map(itemKey).filter(Boolean))
    const missingItems = (Array.isArray(current.items) ? current.items : []).filter(item => {
      const key = itemKey(item)
      return key && !incomingItemKeys.has(key) && !(hasManagerApproval && explicitlyRemoved.has(key))
    })

    return {
      ...current,
      ...incoming,
      items: [...incomingItems, ...missingItems],
    }
  })

  // A waiter may have loaded the screen before another waiter opened a table.
  // Keep that unrelated table rather than deleting it through a stale save.
  for (const table of existingTables) {
    const key = tableKey(table)
    if (key && !incomingKeys.has(key) && !removedTableKeys.has(key)) merged.push(table)
  }
  return merged
}

function stateForSession(state, session) {
  if (session.role !== 'garcom') return state
  return {
    tables: Array.isArray(state.tables) ? state.tables : [],
    products: Array.isArray(state.products) ? state.products : [],
    settings: waiterSettings(state.settings),
  }
}

async function readConsolidatedState(db) {
  const state = await readAppState(db)
  const collectionState = {}

  for (const key of modelKeys) {
    const documents = await readCollectionState(db, key)
    if (documents.length) collectionState[key] = documents
  }

  return { ...state, ...collectionState }
}

export default async function handler(req, res) {
  allowCors(res, 'GET,PUT,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    const session = await requireUser(req, res)
    if (!session) return
    const db = await getDb()

    if (req.method === 'GET') {
      const state = await readConsolidatedState(db)
      res.status(200).json(stateForSession(state, session))
      return
    }

    if (req.method === 'PUT') {
      const body = parseBody(req)
      const roleKeys = session.role === 'garcom' ? ['tables'] : allowedKeys
      const nextState = Object.fromEntries(Object.entries(body).filter(([key]) => roleKeys.includes(key)))

      if (!Object.keys(nextState).length) {
        res.status(400).json({ error: 'Nenhum dado valido para salvar.' })
        return
      }

      const persist = async () => {
        const currentState = await readAppState(db)
        if (Array.isArray(nextState.tables)) {
          nextState.tables = mergeConcurrentTables(
            await readCollectionState(db, 'tables'),
            nextState.tables,
            session,
            nextState.removedTableIds,
            [...(Array.isArray(currentState.closedTablesHistory) ? currentState.closedTablesHistory : []), ...(Array.isArray(nextState.closedTablesHistory) ? nextState.closedTablesHistory : [])]
          )
        }
        delete nextState.removedTableIds
        const protectedState = await syncModelCollections(db, nextState)
        await updateAppState(db, protectedState)
        return protectedState
      }
      const protectedState = Array.isArray(nextState.tables)
        ? await serializeTableWrite(persist)
        : await persist()

      res.status(200).json(stateForSession(await readConsolidatedState(db), session))
      return
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS')
    res.status(405).json({ error: 'Metodo nao permitido.' })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno ao acessar o MongoDB.' })
  }
}
