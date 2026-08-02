import {
  allowCors,
  getDb,
  parseBody,
  readAppState,
  readCollectionState,
  syncModelCollections,
  updateAppState,
} from '../lib/mongo.js'

const modelKeys = ['users', 'products', 'tables']
const allowedKeys = ['users', 'tables', 'settings', 'products', 'salesHistory', 'closings', 'closedTablesHistory']

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
    const db = await getDb()

    if (req.method === 'GET') {
      res.status(200).json(await readConsolidatedState(db))
      return
    }

    if (req.method === 'PUT') {
      const body = parseBody(req)
      const nextState = Object.fromEntries(Object.entries(body).filter(([key]) => allowedKeys.includes(key)))

      if (!Object.keys(nextState).length) {
        res.status(400).json({ error: 'Nenhum dado valido para salvar.' })
        return
      }

      const protectedState = await syncModelCollections(db, nextState)
      await updateAppState(db, protectedState)

      res.status(200).json(await readConsolidatedState(db))
      return
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS')
    res.status(405).json({ error: 'Metodo nao permitido.' })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno ao acessar o MongoDB.' })
  }
}
