import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const localEnvPath = process.env.FOGAO_LOCAL_ENV || path.join(projectRoot, 'local-server', '.env')

dotenv.config({ path: localEnvPath })

function readSecretFile(envKey, fileKey) {
  if (process.env[envKey]) return
  const file = String(process.env[fileKey] || '').trim()
  if (!file) return
  const resolved = path.isAbsolute(file) ? file : path.join(projectRoot, file)
  if (fs.existsSync(resolved)) process.env[envKey] = fs.readFileSync(resolved, 'utf8')
}

readSecretFile('QZ_CERTIFICATE_PEM', 'QZ_CERTIFICATE_FILE')
readSecretFile('QZ_PRIVATE_KEY_PEM', 'QZ_PRIVATE_KEY_FILE')

process.env.LOCAL_MODE ||= 'true'
process.env.COOKIE_SECURE ||= 'false'
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/fogao_a_lenha'
process.env.MONGODB_DB ||= 'fogao_a_lenha'
process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ||= '3000'
process.env.APP_AUTH_SECRET ||= crypto.createHash('sha256').update(`fogao-local-${process.env.MONGODB_DB}`).digest('base64url')

export function assertLocalConfiguration() {
  const uri = String(process.env.MONGODB_URI || '')
  const allowRemote = String(process.env.ALLOW_REMOTE_MONGODB || '').toLowerCase() === 'true'
  if (!allowRemote && !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(uri)) {
    throw new Error('O servidor local recusou um MongoDB remoto. Use localhost ou defina ALLOW_REMOTE_MONGODB=true conscientemente.')
  }
  if (String(process.env.APP_AUTH_SECRET || '').length < 24) {
    throw new Error('APP_AUTH_SECRET precisa ter pelo menos 24 caracteres.')
  }
}
