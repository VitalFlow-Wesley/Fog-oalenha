import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  sector: { type: String, default: 'Bar / Caixa' },
  price: { type: Number, required: true, min: 0 },
  prepare: { type: Boolean, default: false },
  status: { type: String, default: 'Ativo' },
}, { timestamps: true })

export const Product = mongoose.model('Product', productSchema)
