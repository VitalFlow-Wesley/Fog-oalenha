import mongoose from 'mongoose'

const commandItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  category: String,
  sector: String,
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 1 },
  observation: String,
  prepare: { type: Boolean, default: false },
  sentToKitchen: { type: Boolean, default: false },
  cancelled: { type: Boolean, default: false },
}, { _id: true, timestamps: true })

const commandSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: String,
  guests: { type: Number, default: 0 },
  status: { type: String, enum: ['aberta', 'conta_solicitada', 'fechada', 'cancelada'], default: 'aberta' },
  items: [commandItemSchema],
  paymentMethod: { type: String, enum: ['dinheiro', 'pix', 'cartao', 'outros', 'misto', null], default: null },
  discount: { type: Number, default: 0 },
  closedAt: Date,
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

commandSchema.virtual('total').get(function total() {
  const itemsTotal = this.items.filter(item => !item.cancelled).reduce((sum, item) => sum + item.price * item.qty, 0)
  return Math.max(itemsTotal - (this.discount || 0), 0)
})

commandSchema.set('toJSON', { virtuals: true })
commandSchema.set('toObject', { virtuals: true })

export const Command = mongoose.model('Command', commandSchema)
