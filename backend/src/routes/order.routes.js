import { Router } from 'express'

const router = Router()

// Memória centralizada de pedidos em tempo real no servidor
let memoryOrders = []

router.get('/', (req, res) => {
  try {
    let orders = [...memoryOrders]
    if (req.query.tableNumber) {
      orders = orders.filter(o => String(o.tableNumber) === String(req.query.tableNumber))
    }
    if (req.query.status) {
      orders = orders.filter(o => o.status === req.query.status)
    }
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/', (req, res) => {
  try {
    const tableNumber = req.body.tableNumber || 1
    const items = (req.body.items || []).map((item, idx) => {
      const qty = Number(item.qty || 1)
      const unitPrice = Number(item.unitPrice || item.price || 0)
      return {
        _id: item._id || `item_${Date.now()}_${idx}`,
        productId: item.productId,
        name: item.name,
        category: item.category,
        sector: item.sector,
        qty,
        unitPrice,
        total: qty * unitPrice,
        prepare: item.prepare ?? false,
        status: item.status || 'pendente'
      }
    })

    const newOrder = {
      _id: `ord_${Date.now()}`,
      tableId: req.body.tableId || `tbl_${tableNumber}`,
      tableNumber,
      items,
      launchedBy: req.body.launchedBy || 'Atendimento',
      status: 'aberto',
      createdAt: new Date().toISOString()
    }

    memoryOrders.unshift(newOrder)
    res.status(201).json(newOrder)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.patch('/:orderId/items/:itemId/cancel', (req, res) => {
  try {
    const order = memoryOrders.find(o => String(o._id) === String(req.params.orderId))
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' })

    const item = order.items.find(i => String(i._id) === String(req.params.itemId))
    if (!item) return res.status(404).json({ message: 'Item não encontrado' })

    item.status = 'cancelado'
    item.cancelledAt = new Date().toISOString()
    item.cancelReason = req.body.reason || 'Cancelamento autorizado'

    res.json({ order })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.patch('/:orderId/send-to-kitchen', (req, res) => {
  try {
    const order = memoryOrders.find(o => String(o._id) === String(req.params.orderId))
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' })

    order.status = 'enviado'
    order.sentToKitchenAt = new Date().toISOString()
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router