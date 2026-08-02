import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'fogao_a_lenha'
const stateCollectionName = process.env.MONGODB_COLLECTION || 'app_state'
const stateDocumentId = process.env.APP_STATE_ID || 'main'

let cachedClient = null

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI nao configurada no ambiente.')
  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }
  return cachedClient.db(dbName)
}

export function allowCors(res, methods = 'GET,PUT,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
}

export function stripMongoId(document) {
  if (!document || typeof document !== 'object') return document
  const { _id, ...rest } = document
  return rest
}

export async function readCollectionState(db, key) {
  const documents = await db.collection(key).find({}).toArray()
  return documents.map(stripMongoId)
}

export async function readAppState(db) {
  const doc = await db.collection(stateCollectionName).findOne({ _id: stateDocumentId })
  return doc?.state || {}
}

export async function updateAppState(db, patch) {
  if (!patch || !Object.keys(patch).length) return
  const setPayload = Object.fromEntries(Object.entries(patch).map(([key, value]) => [`state.${key}`, value]))
  await db.collection(stateCollectionName).updateOne(
    { _id: stateDocumentId },
    { $set: { ...setPayload, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  )
}
