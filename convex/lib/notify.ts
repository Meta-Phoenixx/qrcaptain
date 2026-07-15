/**
 * Notification service — single place to create all in-app notifications.
 *
 * Domain files call notify(ctx, params) instead of ctx.db.insert("notifications", {...})
 * directly. This ensures every notification has the required fields, consistent
 * timestamps, and a typed `type` field that matches the schema union.
 */

import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

type NotificationType =
  | "access_request"
  | "access_approved"
  | "access_denied"
  | "access_revoked"
  | "work_order_started"
  | "work_order_completed"
  | "work_order_updated"
  | "work_order_requested"
  | "quote_submitted"
  | "quote_accepted"
  | "quote_declined"
  | "request_declined"
  | "new_message"
  | "rate_mechanic_reminder"
  | "rate_owner_reminder"
  | "new_rating_received"
  | "added_to_preferred_list"
  | "onboarding_reminder"
  | "new_announcement";

export interface NotifyParams {
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

export async function notify(
  ctx: MutationCtx,
  params: NotifyParams
): Promise<Id<"notifications">> {
  return ctx.db.insert("notifications", {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedId: params.relatedId,
    relatedType: params.relatedType,
    isRead: false,
    createdAt: Date.now(),
  });
}

/** Convenience: send the same notification to multiple recipients. */
export async function notifyMany(
  ctx: MutationCtx,
  userIds: Id<"users">[],
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify(ctx, { ...params, userId })));
}

// ─── Pre-built notification factories ────────────────────────────────────────
// Named functions for common notification events keep call-sites terse and
// make the intent obvious at the call-site.

export function workOrderStarted(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "work_order_started",
    title: "Work Order Started",
    message: `${params.mechanicName} has started work on ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function workOrderRequested(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselName: string;
    description: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "work_order_requested",
    title: "New Work Order Request",
    message: `${params.ownerName} has requested work on ${params.vesselName}: ${params.description.substring(0, 100)}${params.description.length > 100 ? "..." : ""}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function quoteSubmitted(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    totalQuote: number;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "quote_submitted",
    title: "Quote Received",
    message: `${params.mechanicName} submitted a quote of $${params.totalQuote.toFixed(2)} for work on ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function quoteAccepted(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "quote_accepted",
    title: "Quote Accepted",
    message: `${params.ownerName} accepted your quote for work on ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function quoteDeclined(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "quote_declined",
    title: "Quote Declined",
    message: `${params.ownerName} declined your quote for work on ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function requestDeclined(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "request_declined",
    title: "Work Request Declined",
    message: `${params.mechanicName} declined the work request for ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function workOrderCompleted(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "work_order_completed",
    title: "Work Order Completed",
    message: `${params.mechanicName} has completed work on ${params.vesselName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function workOrderCancelled(
  ctx: MutationCtx,
  params: {
    recipientId: Id<"users">;
    cancellerName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.recipientId,
    type: "work_order_updated",
    title: "Work Order Cancelled",
    message: `The work order for ${params.vesselName} has been cancelled by ${params.cancellerName}`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function rateMechanicReminder(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "rate_mechanic_reminder",
    title: "Rate Your Mechanic",
    message: `How was your experience with ${params.mechanicName} on ${params.vesselName}? Leave a review!`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function rateOwnerReminder(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    vesselName: string;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "rate_owner_reminder",
    title: "Rate the Boat Owner",
    message: `How was your experience working on ${params.vesselName}? Leave a review!`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}

export function newMessage(
  ctx: MutationCtx,
  params: {
    recipientId: Id<"users">;
    senderName: string;
    preview: string;
    relatedId?: string;
    relatedType?: string;
  }
) {
  return notify(ctx, {
    userId: params.recipientId,
    type: "new_message",
    title: "New Message",
    message: `${params.senderName} sent you a message: ${params.preview.substring(0, 80)}${params.preview.length > 80 ? "..." : ""}`,
    relatedId: params.relatedId,
    relatedType: params.relatedType,
  });
}

export function accessRequestNotification(
  ctx: MutationCtx,
  params: {
    ownerId: Id<"users">;
    mechanicName: string;
    vesselName: string;
    requestId: Id<"accessRequests">;
  }
) {
  return notify(ctx, {
    userId: params.ownerId,
    type: "access_request",
    title: "New Access Request",
    message: `${params.mechanicName} has requested access to ${params.vesselName}`,
    relatedId: params.requestId,
    relatedType: "accessRequest",
  });
}

export function accessApproved(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselName: string;
    requestId: Id<"accessRequests">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "access_approved",
    title: "Access Approved",
    message: `${params.ownerName} approved your access request for ${params.vesselName}`,
    relatedId: params.requestId,
    relatedType: "accessRequest",
  });
}

export function accessDenied(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselName: string;
    requestId: Id<"accessRequests">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "access_denied",
    title: "Access Denied",
    message: `${params.ownerName} denied your access request for ${params.vesselName}`,
    relatedId: params.requestId,
    relatedType: "accessRequest",
  });
}

export function addedToPreferredList(
  ctx: MutationCtx,
  params: {
    mechanicId: Id<"users">;
    ownerName: string;
    vesselNames?: string;
    preferredId: Id<"preferredMechanics">;
  }
) {
  return notify(ctx, {
    userId: params.mechanicId,
    type: "added_to_preferred_list",
    title: "Added to Preferred Mechanics",
    message: `${params.ownerName} has added you to their preferred mechanics list${params.vesselNames ? ` and authorized you for: ${params.vesselNames}` : ""}`,
    relatedId: params.preferredId,
    relatedType: "preferredMechanic",
  });
}

export function newRatingReceived(
  ctx: MutationCtx,
  params: {
    recipientId: Id<"users">;
    raterName: string;
    overallRating: number;
    workOrderId: Id<"workOrders">;
  }
) {
  return notify(ctx, {
    userId: params.recipientId,
    type: "new_rating_received",
    title: "New Rating Received",
    message: `${params.raterName} left you a ${params.overallRating}-star rating`,
    relatedId: params.workOrderId,
    relatedType: "workOrder",
  });
}
