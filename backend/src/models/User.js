import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  accessCode: { type: String, required: true },
  role: { type: String, enum: ['admin', 'gerente', 'garcom'], default: 'garcom' },
  active: { type: Boolean, default: true },
  permissions: [{ type: String }],
}, { timestamps: true })

export const User = mongoose.model('User', userSchema)
