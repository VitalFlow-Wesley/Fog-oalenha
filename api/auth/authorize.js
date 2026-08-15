import { authorizeManagerPassword, createManagerApproval, publicUser, requireUser } from '../../lib/auth.js'
import { allowCors, parseBody } from '../../lib/mongo.js'

export default async function handler(req, res) {
  allowCors(res, 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo nao permitido.' })

  try {
    const session = await requireUser(req, res)
    if (!session) return

    const { password } = parseBody(req)
    const manager = await authorizeManagerPassword(password)
    if (!manager) return res.status(401).json({ error: 'Senha de autorizacao invalida.' })

    return res.status(200).json({ authorizedBy: publicUser(manager), approvalToken: createManagerApproval(manager) })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro ao validar autorizacao.' })
  }
}
