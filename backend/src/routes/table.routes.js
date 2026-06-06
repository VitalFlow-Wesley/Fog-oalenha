import { Router } from 'express'
import { Table } from '../models/Table.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const records = await Table.find().sort({ number: 1 })
    res.json(records)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const record = await Table.create(req.body)
    res.status(201).json(record)
  } catch (error) {
    next(error)
  }
})

export default router
