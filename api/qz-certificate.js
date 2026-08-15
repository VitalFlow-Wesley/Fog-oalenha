import { requireUser } from '../lib/auth.js'

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS')
    res.status(405).send('Metodo nao permitido.')
    return
  }

  const isLocalPrintAgent = Boolean(process.env.PRINT_AGENT_TOKEN) && req.headers.authorization === `Bearer ${process.env.PRINT_AGENT_TOKEN}`
  if (!isLocalPrintAgent && !await requireUser(req, res, ['admin', 'gerente'])) return

  const certificate = (process.env.QZ_CERTIFICATE_PEM || process.env.VITE_QZ_CERTIFICATE_PEM || '').replace(/\\n/g, '\n').trim()
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.status(certificate ? 200 : 204).send(certificate)
}
