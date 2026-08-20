import { AuditEvent } from '../models/AuditEvent.js';

export async function recordAudit({ actor, action, entityType, entityId = null, summary, metadata = {} }) {
  if (!actor) return null;
  return AuditEvent.create({ actor, action, entityType, entityId, summary, metadata });
}
