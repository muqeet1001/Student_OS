import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 60, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditEventSchema.index({ createdAt: -1, entityType: 1 });

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
