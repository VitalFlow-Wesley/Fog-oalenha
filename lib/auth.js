import crypto from 'node:crypto'
import { getDb, readCollectionState } from './mongo.js'

const COOKIE_NAME = 'fogao_session'
const SESSION_SECONDS = 12 * 60 * 60

function secret() {
  const value = process.env.APP_AUTH_SECRET || process.env.MONGODB_URI
  if (!value) throw new Error('APP_AUTH_SECRET nao configurado.')
  return value
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url')
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => {
    const index = part.indexOf('=')
    if (index < 0) return ['', '']
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]
  }).filter(([key]) => key))
}

export function publicUser(user) {
  if (!user) return null
  const { password, senha, _id, _syncKey, ...safe } = user
  return safe
}

export function createSession(user) {
  const now = Math.floor(Date.now() / 1000)
  const payload = encode({ id: user.id, username: user.username, role: user.role, iat: now, exp: now + SESSION_SECONDS })
  return `${payload}.${sign(payload)}`
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`)
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

export function readSession(req) {
  const token = parseCookies(req)[COOKIE_NAME]
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return session.exp > Math.floor(Date.now() / 1000) ? session : null
  } catch {
    return null
  }
}

export async function requireUser(req, res, roles = []) {
  const session = readSession(req)
  if (!session || (roles.length && !roles.includes(session.role))) {
    res.status(session ? 403 : 401).json({ error: session ? 'Acesso nao permitido.' : 'Sessao invalida ou expirada.' })
    return null
  }
  return session
}

export async function authenticate(username, password) {
  const db = await getDb()
  const users = await readCollectionState(db, 'users')
  const normalized = String(username || '').trim().toLowerCase()
  return users.find(user => user.active !== false && String(user.username || user.login || '').trim().toLowerCase() === normalized && safeEqual(user.password ?? user.senha ?? '', password || '')) || null
}

export async function authorizeManagerPassword(password) {
  if (!password) return null
  const db = await getDb()
  const users = await readCollectionState(db, 'users')
  return users.find(user => user.active !== false && ['admin', 'gerente'].includes(user.role) && safeEqual(user.password ?? user.senha ?? '', password)) || null
}
