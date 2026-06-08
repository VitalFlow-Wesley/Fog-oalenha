import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  tableNumber: { type: String, trim: true },
  commandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Command' },
  itemName: { type: String, trim: true },
  qty: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
  requestedBy: {
    id: String,
    name: String,
    role: String,
  },
  authorizedBy: {
    id: String,
    name: String,
    role: String,
  },
  reason: { type: String, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
