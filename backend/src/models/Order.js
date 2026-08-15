import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  sector: { type: String, trim: true },
  qty: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  prepare: { type: Boolean, default: false },
  status: { type: String, enum: ['lancado', 'enviado', 'cancelado'], default: 'lancado' },
  cancelledAt: Date,
  cancelReason: String,
}, { _id: true })

const orderSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: { type: String, required: true, trim: true },
  items: [orderItemSchema],
  status: { type: String, enum: ['aberto', 'enviado', 'fechado', 'cancelado'], default: 'aberto' },
  launchedBy: {
    id: String,
    name: String,
    role: String,
  },
  sentToKitchenAt: Date,
  closedAt: Date,
}, { timestamps: true })

orderSchema.index({ tableNumber: 1, createdAt: -1 })
orderSchema.index({ status: 1 })

export const Order = mongoose.model('Order', orderSchema)
