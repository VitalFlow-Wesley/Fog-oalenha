import { clearSessionCookie } from '../../lib/auth.js'
import { allowCors } from '../../lib/mongo.js'

export default function handler(req, res) {
  allowCors(res, 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' })
  clearSessionCookie(res)
  return res.status(204).end()
}
