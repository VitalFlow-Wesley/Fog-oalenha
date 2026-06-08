import { Router } from 'express'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Table } from '../models/Table.js'
import { AuditLog } from '../models/AuditLog.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const query = {}
    if (req.query.tableNumber) query.tableNumber = req.query.tableNumber
    if (req.query.status) query.status = req.query.status
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(300)
    res.json(orders)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const table = await Table.findById(req.body.tableId)
    const tableNumber = req.body.tableNumber || table?.number
    if (!tableNumber) return res.status(400).json({ message: 'Mesa obrigatória' })

    const items = []
    for (const item of req.body.items || []) {
      const product = item.productId ? await Product.findById(item.productId) : null
      const qty = Number(item.qty || 1)
      const unitPrice = Number(item.unitPrice ?? product?.price ?? 0)
      items.push({
        productId: product?._id || item.productId,
        name: item.name || product?.name,
        category: item.category || product?.category,
        sector: item.sector || product?.sector,
        qty,
        unitPrice,
        total: qty * unitPrice,
        prepare: item.prepare ?? product?.prepare ?? false,
      })
    }

    const order = await Order.create({
      tableId: req.body.tableId,
      tableNumber,
      items,
      launchedBy: req.body.launchedBy,
    })

    if (table) {
      table.status = 'ocupada'
      table.guests = req.body.guests ?? table.guests
      table.openedAt = table.openedAt || new Date()
      await table.save()
    }

    res.status(201).json(order)
  } catch (error) {
    next(error)
  }
})

router.patch('/:orderId/items/:itemId/cancel', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' })

    const item = order.items.id(req.params.itemId)
    if (!item) return res.status(404).json({ message: 'Item não encontrado' })

    item.status = 'cancelado'
    item.cancelledAt = new Date()
    item.cancelReason = req.body.reason || 'Cancelamento autorizado'
    await order.save()

    const log = await AuditLog.create({
      action: 'Item cancelado',
      type: 'cancelamento_item',
      tableNumber: order.tableNumber,
      itemName: item.name,
      qty: item.qty,
      value: item.total,
      requestedBy: req.body.requestedBy,
      authorizedBy: req.body.authorizedBy,
      reason: item.cancelReason,
      metadata: { orderId: order._id, itemId: item._id },
    })

    res.json({ order, auditLog: log })
  } catch (error) {
    next(error)
  }
})

router.patch('/:orderId/send-to-kitchen', async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.orderId, { status: 'enviado', sentToKitchenAt: new Date() }, { new: true })
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' })
    res.json(order)
  } catch (error) {
    next(error)
  }
})

export default router
