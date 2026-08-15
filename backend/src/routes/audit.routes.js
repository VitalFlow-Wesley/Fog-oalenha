import { Router } from 'express'
import { AuditLog } from '../models/AuditLog.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const query = {}
    if (req.query.type) query.type = req.query.type
    if (req.query.tableNumber) query.tableNumber = req.query.tableNumber

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(300)
    res.json(logs)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const log = await AuditLog.create(req.body)
    res.status(201).json(log)
  } catch (error) {
    next(error)
  }
})

export default router
