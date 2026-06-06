import mongoose from 'mongoose'

const cashClosingSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  status: { type: String, enum: ['aberto', 'fechado'], default: 'aberto' },
  totals: {
    revenue: { type: Number, default: 0 },
    dinheiro: { type: Number, default: 0 },
    pix: { type: Number, default: 0 },
    cartao: { type: Number, default: 0 },
    outros: { type: Number, default: 0 },
  },
  expectedCash: { type: Number, default: 0 },
  reportedCash: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  note: String,
  closedBy: String,
  closedAt: Date,
}, { timestamps: true })

export const CashClosing = mongoose.model('CashClosing', cashClosingSchema)
