import mongoose from 'mongoose'

const tableSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['livre', 'ocupada', 'enviado', 'conta', 'juntada'], default: 'livre' },
  guests: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  canJoin: { type: Boolean, default: true },
  mergedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  openedAt: Date,
}, { timestamps: true })

export const Table = mongoose.model('Table', tableSchema)
