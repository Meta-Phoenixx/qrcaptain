import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type AuditAction =
  // Vessel actions
  | "vessel.created"
  | "vessel.updated"
  | "vessel.deleted"
  | "vessel.mechanic_authorized"
  | "vessel.mechanic_authorization_revoked"
  // Work order actions
  | "work_order.created"
  | "work_order.status_changed"
  | "work_order.quote_submitted"
  | "work_order.quote_accepted"
  | "work_order.quote_declined"
  | "work_order.completed"
  | "work_order.cancelled"
  // User actions
  | "user.role_changed"
  | "user.profile_updated"
  | "user.onboarding_completed"
  // Access actions
  | "access_request.created"
  | "access_request.approved"
  | "access_request.denied"
  // Rating actions
  | "rating.mechanic_rated"
  | "rating.owner_rated"
  // Admin actions
  | "admin.announcement_created"
  | "admin.announcement_updated"
  | "admin.setting_changed"
  | "admin.user_promoted";

interface AuditParams {
  action: AuditAction;
  actorId: Id<"users">;
  targetId?: string;
  targetType?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit log entry for any important state change.
 * Call this inside mutations after the change has been applied.
 */
export async function logAudit(
  ctx: MutationCtx,
  params: AuditParams
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    action: params.action,
    actorId: params.actorId,
    targetId: params.targetId,
    targetType: params.targetType,
    before: params.before ? JSON.stringify(params.before) : undefined,
    after: params.after ? JSON.stringify(params.after) : undefined,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    createdAt: Date.now(),
  });
}
