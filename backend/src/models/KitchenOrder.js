import mongoose from 'mongoose'

const kitchenOrderItemSchema = new mongoose.Schema({
  commandItemId: String,
  name: String,
  qty: Number,
  observation: String,
  sector: String,
}, { _id: false })

const kitchenOrderSchema = new mongoose.Schema({
  command: { type: mongoose.Schema.Types.ObjectId, ref: 'Command', required: true },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: String,
  sectors: [{ type: String }],
  items: [kitchenOrderItemSchema],
  sentBy: String,
  sentAt: { type: Date, default: Date.now },
  reprints: { type: Number, default: 0 },
}, { timestamps: true })

export const KitchenOrder = mongoose.model('KitchenOrder', kitchenOrderSchema)
