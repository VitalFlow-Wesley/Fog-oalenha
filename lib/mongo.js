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
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
}

export function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
}

export function stripMongoId(document) {
  if (!document || typeof document !== 'object') return document
  const { _id, _syncKey, ...rest } = document
  return rest
}

export async function readCollectionState(db, key) {
  const documents = await db.collection(key).find({}).toArray()
  return documents.map(stripMongoId)
}

function getDocumentKey(collectionName, document) {
  if (!document || typeof document !== 'object') return null
  if (document.id !== undefined && document.id !== null && document.id !== '') return `id:${document.id}`

  if (collectionName === 'tables' && document.number !== undefined && document.number !== null && document.number !== '') {
    return `number:${String(document.number).trim()}`
  }

  if (collectionName === 'users') {
    const login = document.username || document.login || document.name
    return login ? `login:${String(login).trim().toLowerCase()}` : null
  }

  if (collectionName === 'products' && document.name) {
    return `name:${String(document.name).trim().toLowerCase()}`
  }

  return null
}

function normalizeSyncDocument(collectionName, document) {
  const clean = stripMongoId(document)
  const key = getDocumentKey(collectionName, clean)
  return key ? { ...clean, _syncKey: key } : clean
}

function buildSyncFilter(collectionName, document) {
  const key = getDocumentKey(collectionName, document)
  const alternatives = key ? [{ _syncKey: key }] : []

  if (document?.id !== undefined && document.id !== null && document.id !== '') alternatives.push({ id: document.id })

  if (collectionName === 'tables' && document?.number !== undefined && document.number !== null && document.number !== '') {
    alternatives.push({ number: document.number })
  }

  if (collectionName === 'users') {
    if (document?.username) alternatives.push({ username: document.username })
    if (document?.login) alternatives.push({ login: document.login })
  }

  if (collectionName === 'products' && document?.name) alternatives.push({ name: document.name })

  return alternatives.length > 1 ? { $or: alternatives } : alternatives[0]
}

export async function syncCollectionState(db, collectionName, documents, { preserveMissing = false } = {}) {
  if (!Array.isArray(documents)) return null

  const collection = db.collection(collectionName)
  const existing = await collection.find({}).toArray()
  if (!documents.length) {
    if (collectionName === 'tables') {
      if (existing.length) await collection.deleteMany({})
      return []
    }
    if (existing.length) return existing.map(stripMongoId)
  }

  const incomingKeys = new Set(documents.map(document => getDocumentKey(collectionName, document)).filter(Boolean))
  const preservedDocuments = preserveMissing
    ? existing.filter(document => {
        const key = getDocumentKey(collectionName, document)
        return key && !incomingKeys.has(key)
      }).map(stripMongoId)
    : []
  const finalDocuments = [...documents, ...preservedDocuments]

  const finalKeys = new Set(finalDocuments.map(document => getDocumentKey(collectionName, document)).filter(Boolean))
  const operations = []

  for (const document of finalDocuments) {
    const key = getDocumentKey(collectionName, document)
    if (!key) continue
    operations.push({
      replaceOne: {
        filter: buildSyncFilter(collectionName, document),
        replacement: normalizeSyncDocument(collectionName, document),
        upsert: true,
      },
    })
  }

  const removableIds = existing
    .filter(document => {
      const key = getDocumentKey(collectionName, document)
      if (!key || finalKeys.has(key)) return false
      return true
    })
    .map(document => document._id)

  if (removableIds.length) {
    operations.push({ deleteMany: { filter: { _id: { $in: removableIds } } } })
  }

  if (operations.length) await collection.bulkWrite(operations, { ordered: false })
  return finalDocuments.map(stripMongoId)
}

export async function syncModelCollections(db, state) {
  const nextState = { ...state }

  for (const key of ['users', 'products', 'tables']) {
    if (!Array.isArray(state[key])) continue
    const synced = await syncCollectionState(db, key, state[key], {
      preserveMissing: key === 'users' || key === 'products',
    })
    if (Array.isArray(synced)) nextState[key] = synced
  }

  return nextState
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
