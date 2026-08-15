import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI não configurada. Nenhuma credencial deve ser gravada no código.')

const client = new MongoClient(uri)
try {
  await client.connect()
  const db = client.db(process.env.MONGODB_DB || 'fogao_a_lenha')
  const mainDoc = await db.collection(process.env.MONGODB_COLLECTION || 'app_state').findOne({ _id: process.env.APP_STATE_ID || 'main' })
  if (!mainDoc?.state) throw new Error('Estado principal não encontrado.')

  for (const key of ['products', 'users', 'tables']) {
    const documents = Array.isArray(mainDoc.state[key]) ? mainDoc.state[key] : []
    if (!documents.length) continue
    await db.collection(key).deleteMany({})
    await db.collection(key).insertMany(documents)
    process.stdout.write(`${key}: ${documents.length} documentos migrados.\n`)
  }
} finally {
  await client.close()
}
