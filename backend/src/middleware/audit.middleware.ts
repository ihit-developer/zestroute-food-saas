import type { Request } from 'express';
import { AuditLogModel } from '../models/index.js';

export async function recordAuditLog(params: {
  req: Request;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  if (!params.req.auth) return;
  await AuditLogModel.create({
    actorId: params.req.auth.userId,
    actorRole: params.req.auth.roles[0] ?? 'unknown',
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    before: params.before,
    after: params.after,
    ipAddress: params.req.ip,
    userAgent: params.req.headers['user-agent'],
  });
}
