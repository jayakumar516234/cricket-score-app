import { AuditLog } from '../models/AuditLog.js';

export async function audit(user, action, entityType, entityId, details = {}) {
  try {
    await AuditLog.create({
      actor: user?._id,
      actorName: user?.name,
      actorRole: user?.role,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      details,
    });
  } catch (e) {
    console.error('Audit log failed', e.message);
  }
}
