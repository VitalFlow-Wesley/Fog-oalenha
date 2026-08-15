import { publicUser, requireUser } from '../../lib/auth.js'
import { allowCors, getDb, readCollectionState } from '../../lib/mongo.js'

export default async function handler(req, res) {
  allowCors(res, 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo nao permitido.' })
  const session = await requireUser(req, res)
  if (!session) return
  const users = await readCollectionState(await getDb(), 'users')
  const user = users.find(item => String(item.id) === String(session.id) && item.active !== false)
  if (!user) return res.status(401).json({ error: 'Usuario nao encontrado.' })
  return res.status(200).json({ user: publicUser(user) })
}

