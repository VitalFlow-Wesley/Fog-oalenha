function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

export default function handler(req, res) {
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

  const certificate = (process.env.QZ_CERTIFICATE_PEM || process.env.VITE_QZ_CERTIFICATE_PEM || '').replace(/\\n/g, '\n').trim()
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.status(certificate ? 200 : 204).send(certificate)
}
