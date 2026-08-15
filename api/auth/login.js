import { authenticate, createSession, publicUser, setSessionCookie } from '../../lib/auth.js'
import { allowCors, parseBody } from '../../lib/mongo.js'

export default async function handler(req, res) {
  allowCors(res, 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' })
  try {
    const { username, password } = parseBody(req)
    const user = await authenticate(username, password)
    if (!user) return res.status(401).json({ error: 'Login ou senha invalidos.' })
    setSessionCookie(res, createSession(user))
    return res.status(200).json({ user: publicUser(user) })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro ao autenticar.' })
  }
}

