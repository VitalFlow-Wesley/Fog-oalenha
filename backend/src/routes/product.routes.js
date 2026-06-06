import { Router } from 'express'
import { Product } from '../models/Product.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const query = {}
    if (req.query.status) query.status = req.query.status
    if (req.query.activeOnly === 'true') query.status = 'Ativo'
    const products = await Product.find(query).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const product = await Product.create(req.body)
    res.status(201).json(product)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!product) return res.status(404).json({ message: 'Produto nao encontrado' })
    res.json(product)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/status', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: req.body.status || 'Inativo' }, { new: true })
    if (!product) return res.status(404).json({ message: 'Produto nao encontrado' })
    res.json(product)
  } catch (error) {
    next(error)
  }
})

export default router
