import './env.js'
import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'
import { projectRoot, assertLocalConfiguration, localEnvPath } from './env.js'

const checks = []
function record(name, ok, detail) { checks.push({ name, ok, detail }) }

try { assertLocalConfiguration(); record('Configuração local', true, localEnvPath) } catch (error) { record('Configuração local', false, error.message) }
record('Frontend compilado', fs.existsSync(path.join(projectRoot, 'dist', 'index.html')), path.join(projectRoot, 'dist'))

let client
try {
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  await client.connect()
  await client.db(process.env.MONGODB_DB).command({ ping: 1 })
  record('MongoDB Community', true, `${process.env.MONGODB_DB} disponível`)
} catch (error) {
  record('MongoDB Community', false, error.message)
} finally {
  await client?.close().catch(() => {})
}

for (const check of checks) process.stdout.write(`${check.ok ? '[OK]' : '[ERRO]'} ${check.name}: ${check.detail}\n`)
process.exit(checks.every(check => check.ok) ? 0 : 1)
