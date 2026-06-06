import mongoose from 'mongoose'

const printerSchema = new mongoose.Schema({
  label: String,
  name: String,
  role: String,
  status: { type: String, default: 'online' },
}, { _id: true })

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  establishmentName: { type: String, default: 'Fogao a Lenha' },
  phone: String,
  address: String,
  cnpj: String,
  printers: [printerSchema],
  cashierPrinterId: String,
  kitchenPrinterId: String,
  grillPrinterId: String,
  juicePrinterId: String,
  receiptMessage: String,
  printKitchenItems: { type: Boolean, default: true },
  printFullReceipt: { type: Boolean, default: true },
  allowReprint: { type: Boolean, default: true },
}, { timestamps: true })

export const Setting = mongoose.model('Setting', settingSchema)
