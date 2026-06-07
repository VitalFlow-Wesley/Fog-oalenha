import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  login: { type: String, required: true, unique: true, lowercase: true, trim: true },
  credentialHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['administrador', 'gerente', 'caixa', 'garcom'],
    default: 'garcom',
  },
  permissions: {
    launchOrders: { type: Boolean, default: true },
    requestBill: { type: Boolean, default: true },
    cancelItems: { type: Boolean, default: false },
    closeTable: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
    manageSettings: { type: Boolean, default: false },
    closeCash: { type: Boolean, default: false },
  },
  status: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' },
  lastLoginAt: Date,
}, { timestamps: true })

userSchema.index({ login: 1 })

export const User = mongoose.model('User', userSchema)
