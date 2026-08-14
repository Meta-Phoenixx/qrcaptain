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
  | "admin.user_promoted"
  // Fleet actions
  | "fleet.create"
  | "fleet.update"
  | "fleet.delete"
  | "fleet.vessel_added"
  | "fleet.vessel_removed"
  | "fleet.mechanic_authorized"
  | "fleet.mechanic_revoked"
  | "fleet.deletion_requested"
  | "vessel.status_updated"
  | "vessel.insurance_saved"
  | "engine_hours.logged"
  | "captain.assigned"
  | "captain.removed"
  | "captain.distress_sent"
  | "captain_report.resolved"
  | "admin.impersonation_started"
  | "admin.impersonation_ended"
  | "admin.user_role_changed"
  | "admin.password_reset_requested"
  | "admin.user_deleted";

interface AuditParams {
  action: AuditAction;
  actorId: Id<"users">;
  targetId?: string;
  targetType?: string;
  before?: string | Record<string, unknown>;
  after?: string | Record<string, unknown>;
  metadata?: string | Record<string, unknown>;
}

/**
 * Writes an audit log entry for any important state change.
 * Call this inside mutations after the change has been applied.
 */
export async function logAudit(
  ctx: MutationCtx,
  params: AuditParams
): Promise<void> {
  const serialize = (v: string | Record<string, unknown> | undefined) =>
    v === undefined ? undefined : typeof v === "string" ? v : JSON.stringify(v);

  await ctx.db.insert("auditLogs", {
    action: params.action,
    actorId: params.actorId,
    targetId: params.targetId,
    targetType: params.targetType,
    before: serialize(params.before),
    after: serialize(params.after),
    metadata: serialize(params.metadata),
    createdAt: Date.now(),
  });
}
