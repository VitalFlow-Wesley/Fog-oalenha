import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'fogao_a_lenha'
const collectionName = process.env.MONGODB_COLLECTION || 'app_state'
const documentId = process.env.APP_STATE_ID || 'main'

let cachedClient = null

async function getDb() {
  if (!uri) throw new Error('MONGODB_URI não configurada no ambiente.')
  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }
  return cachedClient.db(dbName)
}

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    const db = await getDb()
    const collection = db.collection(collectionName)

    if (req.method === 'GET') {
      const doc = await collection.findOne({ _id: documentId })
      res.status(200).json(doc?.state || {})
      return
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const allowedKeys = ['users', 'tables', 'settings', 'products', 'salesHistory', 'closings', 'closedTablesHistory']
      const nextState = Object.fromEntries(Object.entries(body).filter(([key]) => allowedKeys.includes(key)))

      if (!Object.keys(nextState).length) {
        res.status(400).json({ error: 'Nenhum dado válido para salvar.' })
        return
      }

      const setPayload = Object.fromEntries(Object.entries(nextState).map(([key, value]) => [`state.${key}`, value]))
      
      // 1. Atualiza o documento principal no app_state
      await collection.updateOne(
        { _id: documentId },
        { $set: { ...setPayload, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      )

      // --- 2. SINCRONIZAÇÃO AUTOMÁTICA NAS COLEÇÕES INDIVIDUAIS DO MONGO ---

      // Sincroniza Usuários na coleção 'users'
      if (nextState.users && Array.isArray(nextState.users) && nextState.users.length > 0) {
        await db.collection('users').deleteMany({})
        await db.collection('users').insertMany(nextState.users)
      }

      // Sincroniza Produtos na coleção 'products'
      if (nextState.products && Array.isArray(nextState.products) && nextState.products.length > 0) {
        await db.collection('products').deleteMany({})
        await db.collection('products').insertMany(nextState.products)
      }

      // Sincroniza Mesas na coleção 'tables'
      if (nextState.tables && Array.isArray(nextState.tables) && nextState.tables.length > 0) {
        await db.collection('tables').deleteMany({})
        await db.collection('tables').insertMany(nextState.tables)
      }

      const updated = await collection.findOne({ _id: documentId })
      res.status(200).json(updated?.state || {})
      return
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS')
    res.status(405).json({ error: 'Método não permitido.' })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno ao acessar o MongoDB.' })
  }
}