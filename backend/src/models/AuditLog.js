import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true }, // e.g. team.update, score.undo
    entityType: String,
    entityId: String,
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

export const AuditLog = mongoose.model('AuditLog', auditSchema);
