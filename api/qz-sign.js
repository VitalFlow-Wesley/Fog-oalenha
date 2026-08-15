import crypto from 'crypto'
import { requireUser } from '../lib/auth.js'

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS')
    res.status(405).json({ error: 'Metodo nao permitido.' })
    return
  }

  const isLocalPrintAgent = Boolean(process.env.PRINT_AGENT_TOKEN) && req.headers.authorization === `Bearer ${process.env.PRINT_AGENT_TOKEN}`
  if (!isLocalPrintAgent && !await requireUser(req, res, ['admin', 'gerente'])) return

  const privateKey = (process.env.QZ_PRIVATE_KEY_PEM || '').replace(/\\n/g, '\n').trim()
  if (!privateKey) {
    res.status(204).end()
    return
  }

  try {
    const body = parseBody(req)
    const request = String(body.request || '')
    if (!request) {
      res.status(400).json({ error: 'request e obrigatorio.' })
      return
    }

    const signer = crypto.createSign('RSA-SHA512')
    signer.update(request)
    signer.end()
    const signature = signer.sign(privateKey, 'base64')
    res.status(200).json({ signature })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro ao assinar solicitacao QZ.' })
  }
}
