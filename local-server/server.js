import './env.js'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { projectRoot, assertLocalConfiguration } from './env.js'
import { getSyncStatus, startSyncScheduler } from './sync.js'

assertLocalConfiguration()

const app = express()
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 3000)
const distPath = path.join(projectRoot, 'dist')

app.disable('x-powered-by')
app.use(express.json({ limit: '8mb' }))

function localAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(address => address?.family === 'IPv4' && !address.internal).map(address => address.address)
}

app.get('/api/health', async (_req, res) => {
  try {
    const { getDb } = await import('../lib/mongo.js')
    await (await getDb()).command({ ping: 1 })
    res.json({ ok: true, mode: 'local', database: process.env.MONGODB_DB, version: process.env.npm_package_version || '1.0.0', addresses: localAddresses() })
  } catch (error) {
    res.status(503).json({ ok: false, mode: 'local', error: error.message })
  }
})

app.get('/api/runtime-config', (_req, res) => {
  const addresses = localAddresses()
  res.json({
    mode: 'local',
    label: 'Servidor local do restaurante',
    onlineUrl: process.env.ONLINE_APP_URL || 'https://project-c6vsh.vercel.app',
    localUrl: process.env.LOCAL_APP_URL || (addresses[0] ? `http://${addresses[0]}:${port}` : `http://localhost:${port}`),
    apiBaseUrl: '/api',
    syncEnabled: String(process.env.SYNC_ENABLED || '').toLowerCase() === 'true',
  })
})

app.get('/api/sync-status', (_req, res) => res.json(getSyncStatus()))

const routeModules = [
  ['/api/auth/login', '../api/auth/login.js'],
  ['/api/auth/logout', '../api/auth/logout.js'],
  ['/api/auth/session', '../api/auth/session.js'],
  ['/api/auth/authorize', '../api/auth/authorize.js'],
  ['/api/state', '../api/state.js'],
  ['/api/users', '../api/users.js'],
  ['/api/products', '../api/products.js'],
  ['/api/tables', '../api/tables.js'],
  ['/api/print-jobs', '../api/print-jobs.js'],
  ['/api/qz-certificate', '../api/qz-certificate.js'],
  ['/api/qz-sign', '../api/qz-sign.js'],
]

for (const [route, modulePath] of routeModules) {
  const handler = (await import(modulePath)).default
  app.all(route, (req, res) => Promise.resolve(handler(req, res)).catch(error => {
    if (!res.headersSent) res.status(500).json({ error: error.message || 'Erro interno do servidor local.' })
  }))
}

if (!fs.existsSync(distPath)) {
  process.stderr.write('Frontend não compilado. Execute npm run local:build antes de iniciar.\n')
  process.exit(1)
}

app.use(express.static(distPath, {
  etag: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    // The Vite bundles have hashed names and are safe to cache. The HTML entry
    // must always be refreshed, otherwise an old bundle can request a chunk
    // removed by a later local build (notably the QZ printing module).
    if (path.basename(filePath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-store, max-age=0')
      res.setHeader('Pragma', 'no-cache')
    }
  },
}))
app.get(/.*/, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.sendFile(path.join(distPath, 'index.html'))
})

const server = app.listen(port, host, () => {
  const urls = localAddresses().map(address => `http://${address}:${port}`)
  process.stdout.write(`Fogão a Lenha local iniciado em http://localhost:${port}\n`)
  urls.forEach(url => process.stdout.write(`Rede local: ${url}\n`))
  startSyncScheduler()
})

function shutdown(signal) {
  process.stdout.write(`Encerrando servidor local (${signal})...\n`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 8000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
