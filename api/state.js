import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'fogao_a_lenha'
const collectionName = process.env.MONGODB_COLLECTION || 'app_state'
const documentId = process.env.APP_STATE_ID || 'main'

let cachedClient = null

async function getCollection() {
  if (!uri) throw new Error('MONGODB_URI não configurada no ambiente.')
  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }
  return cachedClient.db(dbName).collection(collectionName)
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
    const collection = await getCollection()

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
      await collection.updateOne(
        { _id: documentId },
        { $set: { ...setPayload, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      )

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
