import { MongoClient, ObjectId } from 'mongodb'
import { readSession } from '../lib/auth.js'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'fogao_a_lenha'
const collectionName = process.env.PRINT_JOBS_COLLECTION || 'print_queue'
const agentToken = process.env.PRINT_AGENT_TOKEN || ''
let cachedClient = null

async function getCollection() {
  if (!uri) throw new Error('MONGODB_URI não configurada no ambiente.')
  if (!cachedClient) { cachedClient = new MongoClient(uri); await cachedClient.connect() }
  const collection = cachedClient.db(dbName).collection(collectionName)
  await collection.createIndex({ dedupeKey: 1 }, { unique: true })
  return collection
}
function allowCors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
}
function authorized(req, roles = []) {
  if (agentToken && req.headers.authorization === `Bearer ${agentToken}`) return true
  const session = readSession(req)
  return Boolean(session && (!roles.length || roles.includes(session.role)))
}
function parseBody(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}) }
function serialize(job) { return job ? { ...job, _id: String(job._id) } : null }
function statusOf(status) { return status === 'printing' ? 'processing' : status === 'error' ? 'failed' : status }

export default async function handler(req, res) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    const collection = await getCollection()
    if (req.method === 'POST') {
      if (!authorized(req)) return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
      const body = parseBody(req)
      const dedupeKey = String(body.dedupeKey || '').trim()
      if (!dedupeKey) return res.status(400).json({ error: 'dedupeKey é obrigatório.' })
      const session = readSession(req)
      const job = {
        type: ['kitchen', 'cashier', 'bill'].includes(body.type) ? body.type : 'kitchen',
        kind: String(body.kind || 'order'), status: 'pending', dedupeKey,
        title: String(body.title || 'PEDIDO DE PREPARO'), printerName: String(body.printerName || ''),
        tableNumber: String(body.tableNumber || body.table?.number || ''), table: body.table && typeof body.table === 'object' ? body.table : null,
        customerName: String(body.customerName || body.table?.customerName || ''), waiterName: String(body.waiterName || ''),
        requestedBy: { id: session?.id || '', name: session?.name || session?.username || body.waiterName || '' },
        guests: Number(body.guests ?? body.peopleCount ?? 0), peopleCount: Number(body.peopleCount ?? body.guests ?? 0),
        items: Array.isArray(body.items) ? body.items : [], total: Number(body.total || 0), reprint: Boolean(body.reprint),
        paymentMethod: String(body.paymentMethod || ''), remainingTotal: Number(body.remainingTotal || 0), remainingGuests: Number(body.remainingGuests || 0),
        reservation: body.reservation && typeof body.reservation === 'object' ? body.reservation : null,
        closing: body.closing && typeof body.closing === 'object' ? body.closing : null,
        sourceDevice: String(body.sourceDevice || ''), attempts: 0, lastError: '', agentId: '',
        createdAt: new Date(), updatedAt: new Date(), startedAt: null, printedAt: null,
      }
      try {
        const result = await collection.insertOne(job)
        process.stdout.write(`[PRINT] job=${result.insertedId} queued type=${job.type} target=${job.printerName || 'agent-default'}\n`)
        return res.status(201).json(serialize({ ...job, _id: result.insertedId }))
      } catch (error) {
        if (error?.code !== 11000) throw error
        return res.status(200).json(serialize(await collection.findOne({ dedupeKey })))
      }
    }
    if (!authorized(req)) return res.status(401).json({ error: 'Agente de impressão não autorizado.' })
    if (req.method === 'GET') {
      const id = String(req.query.id || '')
      if (id) {
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Identificador inválido.' })
        return res.status(200).json(serialize(await collection.findOne({ _id: new ObjectId(id) })))
      }
      const statuses = String(req.query.status || 'pending').split(',').map(statusOf).filter(Boolean)
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)))
      return res.status(200).json((await collection.find({ status: { $in: statuses } }).sort({ createdAt: 1 }).limit(limit).toArray()).map(serialize))
    }
    if (req.method === 'PATCH') {
      const body = parseBody(req), id = String(body.id || ''), status = statusOf(String(body.status || ''))
      if (!ObjectId.isValid(id) || !['pending', 'processing', 'printed', 'failed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Atualização inválida.' })
      const now = new Date(), update = { status, updatedAt: now }
      if (status === 'processing') Object.assign(update, { startedAt: now, agentId: String(body.agentId || body.printer || '') })
      if (status === 'printed') Object.assign(update, { printedAt: now, printer: String(body.printer || ''), lastError: '' })
      if (status === 'failed') update.lastError = String(body.error || 'Falha desconhecida.').slice(0, 500)
      if (status === 'pending') Object.assign(update, { lastError: '', retryRequestedAt: now })
      const filter = status === 'processing' ? { _id: new ObjectId(id), status: 'pending' } : { _id: new ObjectId(id) }
      const result = await collection.findOneAndUpdate(filter, { $set: update, ...(status === 'processing' ? { $inc: { attempts: 1 } } : {}) }, { returnDocument: 'after' })
      const job = result?.value || result
      if (!job) return res.status(409).json({ error: 'Job não está mais aguardando.' })
      process.stdout.write(`[PRINT] job=${id} status=${status}${body.printer ? ` target=${body.printer}` : ''}${body.error ? ` error=${String(body.error).slice(0, 160)}` : ''}\n`)
      return res.status(200).json(serialize(job))
    }
    res.setHeader('Allow', 'GET,POST,PATCH,OPTIONS'); return res.status(405).json({ error: 'Método não permitido.' })
  } catch (error) { return res.status(500).json({ error: error.message || 'Erro interno na fila de impressão.' }) }
}
