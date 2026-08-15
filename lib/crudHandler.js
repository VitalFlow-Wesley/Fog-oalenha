import {
  allowCors,
  getDb,
  parseBody,
  readCollectionState,
  syncCollectionState,
  updateAppState,
} from './mongo.js'
import { publicUser, requireUser } from './auth.js'

const modelConfigs = {
  users: { methods: 'GET,POST,PUT,DELETE,OPTIONS' },
  products: { methods: 'GET,POST,PUT,DELETE,OPTIONS' },
  tables: { methods: 'GET,POST,PUT,DELETE,OPTIONS' },
}

function normalizeId(value) {
  return value === undefined || value === null ? '' : String(value)
}

function sameModelDocument(collectionName, current, target) {
  if (!current || !target) return false
  if (normalizeId(current.id) && normalizeId(current.id) === normalizeId(target.id)) return true

  if (collectionName === 'tables') return normalizeId(current.number) === normalizeId(target.number)
  if (collectionName === 'users') {
    const currentLogin = normalizeId(current.username || current.login || current.name).toLowerCase()
    const targetLogin = normalizeId(target.username || target.login || target.name).toLowerCase()
    return Boolean(currentLogin && currentLogin === targetLogin)
  }

  if (collectionName === 'products') return normalizeId(current.name).toLowerCase() === normalizeId(target.name).toLowerCase()
  return false
}

function getTargetFromRequest(req, body) {
  const queryId = req.query?.id
  if (queryId !== undefined && queryId !== null && queryId !== '') return { id: queryId }
  return body || {}
}

export function createCrudHandler(collectionName) {
  if (!modelConfigs[collectionName]) throw new Error(`Colecao nao suportada: ${collectionName}`)

  return async function handler(req, res) {
    allowCors(res, modelConfigs[collectionName].methods)

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    try {
      const roles = collectionName === 'tables' ? [] : ['admin', 'gerente']
      const session = await requireUser(req, res, roles)
      if (!session) return
      const db = await getDb()
      const current = await readCollectionState(db, collectionName)

      if (req.method === 'GET') {
        const response = collectionName === 'users' && session.role === 'garcom' ? current.map(publicUser) : current
        res.status(200).json(response)
        return
      }

      const body = parseBody(req)

      if (req.method === 'POST') {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          res.status(400).json({ error: 'Documento invalido.' })
          return
        }

        const exists = current.some(item => sameModelDocument(collectionName, item, body))
        const next = exists
          ? current.map(item => sameModelDocument(collectionName, item, body) ? { ...item, ...body } : item)
          : [...current, body]
        const synced = await syncCollectionState(db, collectionName, next)
        await updateAppState(db, { [collectionName]: synced })
        res.status(exists ? 200 : 201).json(synced.find(item => sameModelDocument(collectionName, item, body)) || body)
        return
      }

      if (req.method === 'PUT') {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          res.status(400).json({ error: 'Documento invalido.' })
          return
        }

        const target = getTargetFromRequest(req, body)
        const found = current.some(item => sameModelDocument(collectionName, item, target))
        const next = found
          ? current.map(item => sameModelDocument(collectionName, item, target) ? { ...item, ...body } : item)
          : [...current, body]
        const synced = await syncCollectionState(db, collectionName, next)
        await updateAppState(db, { [collectionName]: synced })
        res.status(found ? 200 : 201).json(synced.find(item => sameModelDocument(collectionName, item, body)) || body)
        return
      }

      if (req.method === 'DELETE') {
        const target = getTargetFromRequest(req, body)
        const next = current.filter(item => !sameModelDocument(collectionName, item, target))

        if (next.length === current.length) {
          res.status(404).json({ error: 'Documento nao encontrado.' })
          return
        }

        const synced = await syncCollectionState(db, collectionName, next)
        if (synced.some(item => sameModelDocument(collectionName, item, target))) {
          res.status(409).json({ error: 'Documento possui movimento e foi preservado.' })
          return
        }

        await updateAppState(db, { [collectionName]: synced })
        res.status(200).json({ deleted: true })
        return
      }

      res.setHeader('Allow', modelConfigs[collectionName].methods)
      res.status(405).json({ error: 'Metodo nao permitido.' })
    } catch (error) {
      res.status(500).json({ error: error.message || 'Erro interno ao acessar o MongoDB.' })
    }
  }
}
