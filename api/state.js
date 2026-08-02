import {
  allowCors,
  getDb,
  parseBody,
  readAppState,
  readCollectionState,
  syncModelCollections,
  updateAppState,
} from '../lib/mongo.js'
import { requireUser } from '../lib/auth.js'

const modelKeys = ['users', 'products', 'tables']
const allowedKeys = ['users', 'tables', 'settings', 'products', 'salesHistory', 'closings', 'closedTablesHistory']
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

function waiterSettings(settings = {}) {
  return {
    ...Object.fromEntries(waiterSettingKeys.filter(key => key in settings).map(key => [key, settings[key]])),
    cancelPassword: null,
    cancelUpdatedBy: null,
  }
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

      const protectedState = await syncModelCollections(db, nextState)
      await updateAppState(db, protectedState)

      res.status(200).json(stateForSession(await readConsolidatedState(db), session))
      return
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS')
    res.status(405).json({ error: 'Metodo nao permitido.' })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno ao acessar o MongoDB.' })
  }
}
