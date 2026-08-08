export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }
  return res.status(200).json({
    mode: 'online',
    label: 'Sistema online',
    apiBaseUrl: '/api',
    onlineUrl: process.env.ONLINE_APP_URL || 'https://project-c6vsh.vercel.app',
    localUrl: process.env.LOCAL_APP_URL || '',
    syncEnabled: false,
  })
}
