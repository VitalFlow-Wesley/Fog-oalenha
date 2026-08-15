import { MongoClient } from 'mongodb'

const historyKeys = ['salesHistory', 'closings', 'closedTablesHistory']
let lastSyncStatus = { state: 'idle', direction: null, at: null, error: null, counts: {} }

function documentKey(collection, document) {
  if (document?.id !== undefined && document.id !== null && document.id !== '') return `id:${document.id}`
  if (collection === 'tables' && document?.number !== undefined) return `number:${String(document.number).trim()}`
  if (collection === 'users') return `login:${String(document?.username || document?.login || document?.name || '').trim().toLowerCase()}`
  if (collection === 'products') return `name:${String(document?.name || '').trim().toLowerCase()}`
  return null
}

function cleanDocument(document) {
  if (!document || typeof document !== 'object') return document
  const { _id, _syncKey, ...clean } = document
  return clean
}

function mergeById(primary = [], secondary = []) {
  const seen = new Set()
  return [...primary, ...secondary].filter(item => {
    const key = String(item?.id || `${item?.date || ''}:${item?.closedAt || ''}:${item?.tableNumber || ''}`)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function readSnapshot(db) {
  const appState = await db.collection(process.env.MONGODB_COLLECTION || 'app_state').findOne({ _id: process.env.APP_STATE_ID || 'main' })
  const state = { ...(appState?.state || {}) }
  for (const collection of ['users', 'products', 'tables']) {
    const documents = await db.collection(collection).find({}).toArray()
    if (documents.length || collection === 'tables') state[collection] = documents.map(cleanDocument)
  }
  return state
}

async function replaceCollection(db, name, documents = []) {
  const collection = db.collection(name)
  const normalized = documents.map(cleanDocument).filter(document => documentKey(name, document))
  const operations = normalized.map(document => ({
    replaceOne: {
      filter: { _syncKey: documentKey(name, document) },
      replacement: { ...document, _syncKey: documentKey(name, document) },
      upsert: true,
    },
  }))
  if (operations.length) await collection.bulkWrite(operations, { ordered: false })
  const keys = normalized.map(document => documentKey(name, document))
  if (keys.length) await collection.deleteMany({ _syncKey: { $nin: keys } })
  else await collection.deleteMany({})
}

async function writeSnapshot(db, sourceState, targetState, direction) {
  const merged = { ...targetState, ...sourceState }
  for (const key of historyKeys) merged[key] = mergeById(sourceState[key], targetState[key])
  merged.syncMetadata = { direction, syncedAt: new Date().toISOString(), source: direction === 'push' ? 'local' : 'online' }

  await db.collection('sync_backups').insertOne({ createdAt: new Date(), direction, state: targetState })
  for (const collection of ['users', 'products', 'tables']) await replaceCollection(db, collection, merged[collection] || [])
  await db.collection(process.env.MONGODB_COLLECTION || 'app_state').updateOne(
    { _id: process.env.APP_STATE_ID || 'main' },
    { $set: { state: merged, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  )
  return merged
}

export function getSyncStatus() { return lastSyncStatus }

export async function synchronize(direction = 'push') {
  if (!['push', 'pull'].includes(direction)) throw new Error('Direção de sincronização inválida.')
  const localUri = process.env.MONGODB_URI
  const onlineUri = process.env.ONLINE_MONGODB_URI
  if (!onlineUri) throw new Error('ONLINE_MONGODB_URI não configurada.')
  if (onlineUri === localUri) throw new Error('MongoDB local e online não podem usar a mesma conexão.')

  const localClient = new MongoClient(localUri, { serverSelectionTimeoutMS: 5000 })
  const onlineClient = new MongoClient(onlineUri, { serverSelectionTimeoutMS: 8000 })
  lastSyncStatus = { state: 'running', direction, at: new Date().toISOString(), error: null, counts: {} }

  try {
    await Promise.all([localClient.connect(), onlineClient.connect()])
    const localDb = localClient.db(process.env.MONGODB_DB || 'fogao_a_lenha')
    const onlineDb = onlineClient.db(process.env.ONLINE_MONGODB_DB || process.env.MONGODB_DB || 'fogao_a_lenha')
    const [localState, onlineState] = await Promise.all([readSnapshot(localDb), readSnapshot(onlineDb)])
    const sourceState = direction === 'push' ? localState : onlineState
    const targetState = direction === 'push' ? onlineState : localState
    const targetDb = direction === 'push' ? onlineDb : localDb
    const merged = await writeSnapshot(targetDb, sourceState, targetState, direction)
    lastSyncStatus = {
      state: 'success', direction, at: new Date().toISOString(), error: null,
      counts: { users: merged.users?.length || 0, products: merged.products?.length || 0, tables: merged.tables?.length || 0, salesHistory: merged.salesHistory?.length || 0, closings: merged.closings?.length || 0 },
    }
    return lastSyncStatus
  } catch (error) {
    lastSyncStatus = { state: 'error', direction, at: new Date().toISOString(), error: error.message, counts: {} }
    throw error
  } finally {
    await Promise.allSettled([localClient.close(), onlineClient.close()])
  }
}

export function startSyncScheduler() {
  if (String(process.env.SYNC_ENABLED || '').toLowerCase() !== 'true' || !process.env.ONLINE_MONGODB_URI) return null
  const interval = Math.max(30000, Number(process.env.SYNC_INTERVAL_MS || 60000))
  const run = () => synchronize('push').then(status => process.stdout.write(`Sincronização concluída: ${JSON.stringify(status.counts)}\n`)).catch(error => process.stderr.write(`Sincronização adiada: ${error.message}\n`))
  const timer = setInterval(run, interval)
  timer.unref()
  setTimeout(run, 5000).unref()
  return timer
}
