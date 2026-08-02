import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'fogao_a_lenha'
const collectionName = process.env.PRINT_JOBS_COLLECTION || 'print_queue'
const agentToken = process.env.PRINT_AGENT_TOKEN || ''

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

function authorized(req) {
  if (!agentToken) return true
  return req.headers.authorization === `Bearer ${agentToken}`
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
}

function serialize(job) {
  if (!job) return null
  return { ...job, _id: String(job._id) }
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    const collection = await getCollection()

    if (req.method === 'POST') {
      const body = parseBody(req)
      const allowedTypes = ['kitchen', 'cashier', 'bill']
      const type = allowedTypes.includes(body.type) ? body.type : 'kitchen'
      const dedupeKey = String(body.dedupeKey || '').trim()

      if (!dedupeKey) {
        res.status(400).json({ error: 'dedupeKey é obrigatório.' })
        return
      }

      const existing = await collection.findOne({ dedupeKey })
      if (existing) {
        res.status(200).json(serialize(existing))
        return
      }

      const job = {
        type,
        status: 'pending',
        dedupeKey,
        title: String(body.title || (type === 'bill' ? 'COMANDA DO CLIENTE' : 'PEDIDO DE PREPARO')),
        printerName: String(body.printerName || ''),
        tableNumber: String(body.tableNumber || ''),
        table: body.table && typeof body.table === 'object' ? body.table : null,
        customerName: String(body.customerName || ''),
        waiterName: String(body.waiterName || ''),
        guests: Number(body.guests ?? body.peopleCount ?? 0),
        peopleCount: Number(body.peopleCount ?? body.guests ?? 0),
        items: Array.isArray(body.items) ? body.items : [],
        total: Number(body.total || 0),
        reprint: Boolean(body.reprint),
        sourceDevice: String(body.sourceDevice || ''),
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await collection.insertOne(job)
      res.status(201).json(serialize({ ...job, _id: result.insertedId }))
      return
    }

    if (!authorized(req)) {
      res.status(401).json({ error: 'Agente de impressão não autorizado.' })
      return
    }

    if (req.method === 'GET') {
      const status = String(req.query.status || 'pending')
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)))
      const jobs = await collection.find({ status }).sort({ createdAt: 1 }).limit(limit).toArray()
      res.status(200).json(jobs.map(serialize))
      return
    }

    if (req.method === 'PATCH') {
      const body = parseBody(req)
      const id = String(body.id || '')
      const status = String(body.status || '')
      const allowedStatuses = ['printing', 'printed', 'error']

      if (!ObjectId.isValid(id) || !allowedStatuses.includes(status)) {
        res.status(400).json({ error: 'Atualização inválida.' })
        return
      }

      const update = {
        status,
        updatedAt: new Date(),
        ...(body.error ? { error: String(body.error).slice(0, 500) } : {}),
        ...(status === 'printing' ? { startedAt: new Date() } : {}),
        ...(status === 'printed' ? { printedAt: new Date(), printer: String(body.printer || '') } : {}),
      }

      const filter = status === 'printing'
        ? { _id: new ObjectId(id), status: 'pending' }
        : { _id: new ObjectId(id) }

      const result = await collection.findOneAndUpdate(
        filter,
        { $set: update, $inc: status === 'printing' ? { attempts: 1 } : {} },
        { returnDocument: 'after' }
      )

      const updatedJob = result?.value || result
      if (!updatedJob) {
        res.status(409).json({ error: 'Job nÃ£o estÃ¡ mais pendente.' })
        return
      }

      res.status(200).json(serialize(updatedJob))
      return
    }

    res.setHeader('Allow', 'GET,POST,PATCH,OPTIONS')
    res.status(405).json({ error: 'Método não permitido.' })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno na fila de impressão.' })
  }
}
