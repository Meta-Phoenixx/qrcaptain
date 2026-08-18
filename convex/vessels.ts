import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { sendEmail } from "./lib/email";
import {
  getAuthenticatedUser,
  requireRole,
  requireOwnerClass,
  requireVesselOwnerOrAdmin,
} from "./lib/auth";
import { logAudit } from "./lib/audit";
import { Errors } from "./lib/errors";
import { getFileUrl } from "./lib/fileStorage";
import { requireMaxLength } from "./lib/validate";

function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}

export const listMyVessels = query({
  args: {},
  handler: async (ctx) => {
    const realUser = await getAuthenticatedUser(ctx);
    if (!realUser) return [];

    // Resolve impersonation: if admin is impersonating, operate as the target user
    let user = realUser;
    if (realUser.role === "admin" && realUser.impersonatingAs) {
      const target = await ctx.db.get(realUser.impersonatingAs);
      if (target) user = target;
    }

    const userId = user._id;
    let vessels: Doc<"vessels">[] = [];

    if (user.role === "owner") {
      vessels = await ctx.db
        .query("vessels")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
    } else if (user.role === "mechanic") {
      const authorizations = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const vesselResults = await Promise.all(
        authorizations.map((auth) => ctx.db.get(auth.vesselId))
      );
      vessels = vesselResults.filter(Boolean) as Doc<"vessels">[];
    } else if (user.role === "fleet_manager") {
      const fleets = await ctx.db
        .query("fleets")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const vesselResults = await Promise.all(
        fleets.map((f) =>
          ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", f._id)).collect()
        )
      );
      vessels = vesselResults.flat();
    } else if (user.role === "admin") {
      vessels = await ctx.db.query("vessels").collect();
    }

    return Promise.all(
      vessels.map(async (vessel) => {
        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
          .collect();

        const activeWorkOrders = workOrders.filter(
          (wo) => wo.status === "in_progress"
        );

        let activeWorkOrderInfo = null;
        if (activeWorkOrders.length > 0) {
          const latest = activeWorkOrders[0];
          const mechanic = await ctx.db.get(latest.mechanicId);
          activeWorkOrderInfo = {
            _id: latest._id,
            description: latest.description,
            startedAt: latest.startedAt,
            mechanicName:
              mechanic?.firstName && mechanic?.lastName
                ? `${mechanic.firstName} ${mechanic.lastName}`
                : mechanic?.name ?? "Unknown",
            mechanicCompany: mechanic?.companyName,
          };
        }

        return {
          ...vessel,
          imageUrl: await getFileUrl(ctx, vessel.imageStorageId),
          activeWorkOrderCount: activeWorkOrders.length,
          activeWorkOrder: activeWorkOrderInfo,
          totalWorkOrders: workOrders.length,
          completedWorkOrders: workOrders.filter(
            (wo) => wo.status === "completed"
          ).length,
        };
      })
    );
  },
});

export const getVessel = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    if (user.role === "owner" && vessel.ownerId !== user._id) return null;

    if (user.role === "mechanic") {
      // Check vessel-level authorization
      const vesselAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", args.vesselId).eq("mechanicId", user._id)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (!vesselAuth) {
        // Check fleet-level authorization
        const fleetId = vessel.fleetId;
        if (!fleetId) return null;
        const fleetAuth = await ctx.db
          .query("fleetMechanicAuthorizations")
          .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", fleetId).eq("mechanicId", user._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();
        if (!fleetAuth) return null;
      }
    }

    const owner = await ctx.db.get(vessel.ownerId);

    return {
      ...vessel,
      ownerName:
        owner?.firstName && owner?.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : owner?.name,
      ownerEmail: owner?.email,
    };
  },
});

// Returns which required fields are still missing on a vessel profile.
// "Required" for our purposes: hull ID (HIN), registration number, a photo,
// and at least one propulsion equipment item.
export const getVesselCompleteness = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) return null;

    const propulsionItems = await ctx.db
      .query("vesselEquipment")
      .withIndex("by_vessel_category", (q) =>
        q.eq("vesselId", args.vesselId).eq("category", "propulsion")
      )
      .first();

    const engineHoursEntry = await ctx.db
      .query("engineHoursLog")
      .withIndex("by_vessel", (q) => q.eq("vesselId", args.vesselId))
      .first();

    const missing: string[] = [];
    if (!vessel.hullId) missing.push("Hull ID / HIN");
    if (!vessel.registrationNumber) missing.push("Registration Number");
    if (!vessel.imageStorageId) missing.push("Vessel Photo");
    if (!propulsionItems) missing.push("Engine / Propulsion Equipment");
    if (!engineHoursEntry) missing.push("Engine Hours");

    return { isComplete: missing.length === 0, missing };
  },
});

export const getAuthorizedVessels = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "mechanic") return [];

    const userId = user._id;

    const authorizations = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const results = await Promise.all(
      authorizations.map(async (auth) => {
        const vessel = await ctx.db.get(auth.vesselId);
        if (!vessel) return null;

        const owner = await ctx.db.get(vessel.ownerId);

        const workOrders = await ctx.db
          .query("workOrders")
          .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
          .filter((q) => q.eq(q.field("mechanicId"), userId))
          .collect();

        return {
          _id: vessel._id,
          name: vessel.name,
          make: vessel.make,
          model: vessel.model,
          year: vessel.year,
          vesselType: vessel.vesselType,
          qrCodeData: vessel.qrCodeData,
          imageUrl: await getFileUrl(ctx, vessel.imageStorageId),
          owner: owner
            ? {
                _id: owner._id,
                name:
                  owner.firstName && owner.lastName
                    ? `${owner.firstName} ${owner.lastName}`
                    : owner.name ?? "Unknown",
                email: owner.email,
                phone: owner.phone,
                profilePhotoUrl: await getFileUrl(ctx, owner.profilePhotoStorageId),
              }
            : null,
          authorization: { authorizedAt: auth.authorizedAt },
          stats: {
            activeWorkOrders: workOrders.filter(
              (wo) => wo.status === "in_progress"
            ).length,
            completedWorkOrders: workOrders.filter(
              (wo) => wo.status === "completed"
            ).length,
            totalWorkOrders: workOrders.length,
          },
        };
      })
    );

    return results.filter(Boolean);
  },
});

export const getVesselByQRCode = query({
  args: { qrCodeData: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return null;

    const vessel = await ctx.db
      .query("vessels")
      .withIndex("by_qr_code", (q) => q.eq("qrCodeData", args.qrCodeData))
      .first();

    if (!vessel) return null;

    const owner = await ctx.db.get(vessel.ownerId);
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
      .collect();

    return {
      ...vessel,
      ownerName:
        owner?.firstName && owner?.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : owner?.name,
      ownerEmail: owner?.email,
      workOrderCount: workOrders.length,
    };
  },
});

// Public — no auth required. Returns minimal vessel info for the scan landing page.
export const getVesselPublicInfo = query({
  args: { qrCodeData: v.string() },
  handler: async (ctx, args) => {
    const vessel = await ctx.db
      .query("vessels")
      .withIndex("by_qr_code", (q) => q.eq("qrCodeData", args.qrCodeData))
      .first();

    if (!vessel) return null;

    const owner = await ctx.db.get(vessel.ownerId);
    return {
      vesselId: vessel._id,
      name: vessel.name,
      make: vessel.make,
      model: vessel.model,
      year: vessel.year,
      ownerId: vessel.ownerId,
      ownerName:
        owner?.firstName && owner?.lastName
          ? `${owner.firstName} ${owner.lastName}`
          : (owner?.name ?? "the owner"),
    };
  },
});

// Checks whether the current authenticated user can view this vessel.
// Returns { canView, vessel, reason } where reason explains a denial.
export const checkVesselAccess = query({
  args: { qrCodeData: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) return { canView: false, vessel: null, reason: "unauthenticated" as const };

    const vessel = await ctx.db
      .query("vessels")
      .withIndex("by_qr_code", (q) => q.eq("qrCodeData", args.qrCodeData))
      .first();

    if (!vessel) return { canView: false, vessel: null, reason: "not_found" as const };

    const owner = await ctx.db.get(vessel.ownerId);

    // Owner or admin always has access
    if (vessel.ownerId === user._id || user.role === "admin") {
      return { canView: true, vessel: { ...vessel, ownerName: owner?.firstName ? `${owner.firstName} ${owner.lastName}` : (owner?.name ?? "") }, reason: null };
    }

    // Check mechanic authorization on the vessel
    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", vessel._id).eq("mechanicId", user._id)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (auth) {
      return { canView: true, vessel: { ...vessel, ownerName: owner?.firstName ? `${owner.firstName} ${owner.lastName}` : (owner?.name ?? "") }, reason: null };
    }

    // Check fleet-level authorization
    if (vessel.fleetId) {
      const fleetAuth = await ctx.db
        .query("fleetMechanicAuthorizations")
        .withIndex("by_fleet_mechanic", (q) =>
          q.eq("fleetId", vessel.fleetId!).eq("mechanicId", user._id)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (fleetAuth) {
        return { canView: true, vessel: { ...vessel, ownerName: owner?.firstName ? `${owner.firstName} ${owner.lastName}` : (owner?.name ?? "") }, reason: null };
      }
    }

    // Check if there's already a pending access request
    const existingRequest = await ctx.db
      .query("accessRequests")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", vessel._id).eq("mechanicId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    return {
      canView: false,
      vessel: {
        _id: vessel._id,
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
        ownerId: vessel.ownerId,
        ownerName: owner?.firstName ? `${owner.firstName} ${owner.lastName}` : (owner?.name ?? "the owner"),
      },
      reason: "unauthorized" as const,
      hasPendingRequest: !!existingRequest,
    };
  },
});

export const createVessel = mutation({
  args: {
    name: v.string(),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vesselType: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwnerClass(ctx);

    requireMaxLength(args.name, "Vessel name", 200);
    requireMaxLength(args.make, "Make", 100);
    requireMaxLength(args.model, "Model", 100);
    requireMaxLength(args.vesselType, "Vessel type", 100);
    if (args.registrationNumber !== undefined) requireMaxLength(args.registrationNumber, "Registration number", 100);
    if (args.hullId !== undefined) requireMaxLength(args.hullId, "Hull ID", 100);
    if (args.notes !== undefined) requireMaxLength(args.notes, "Notes", 2000);

    const qrCodeData = generateQRCodeData();

    const vesselId = await ctx.db.insert("vessels", {
      ownerId: userId,
      ...args,
      qrCodeData,
    });

    await logAudit(ctx, {
      action: "vessel.created",
      actorId: userId,
      targetId: vesselId,
      targetType: "vessels",
      after: { name: args.name, make: args.make, model: args.model, year: args.year },
    });

    return { vesselId, qrCodeData };
  },
});

export const updateVessel = mutation({
  args: {
    vesselId: v.id("vessels"),
    name: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    vesselType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, vessel } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    if (args.name !== undefined) requireMaxLength(args.name, "Vessel name", 200);
    if (args.make !== undefined) requireMaxLength(args.make, "Make", 100);
    if (args.model !== undefined) requireMaxLength(args.model, "Model", 100);
    if (args.vesselType !== undefined) requireMaxLength(args.vesselType, "Vessel type", 100);
    if (args.hullId !== undefined) requireMaxLength(args.hullId, "Hull ID", 100);
    if (args.notes !== undefined) requireMaxLength(args.notes, "Notes", 2000);

    const { vesselId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(vesselId, updates);

    await logAudit(ctx, {
      action: "vessel.updated",
      actorId: userId,
      targetId: vesselId,
      targetType: "vessels",
      before: { name: vessel.name, make: vessel.make, model: vessel.model },
      after: updates,
    });

    return { success: true };
  },
});

export const deleteVessel = mutation({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const { userId, vessel } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    await ctx.db.delete(args.vesselId);

    await logAudit(ctx, {
      action: "vessel.deleted",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      before: { name: vessel.name, make: vessel.make, model: vessel.model },
    });

    return { success: true };
  },
});

export const authorizeMechanic = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      throw Errors.validation("Invalid mechanic");
    }

    const existing = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    let authorizationId;
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true });
      authorizationId = existing._id;
    } else {
      authorizationId = await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    }

    await logAudit(ctx, {
      action: "vessel.mechanic_authorized",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      metadata: { mechanicId: args.mechanicId },
    });

    return { authorizationId };
  },
});

export const revokeMechanicAuthorization = mutation({
  args: {
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVesselOwnerOrAdmin(ctx, args.vesselId);

    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    if (auth) {
      await ctx.db.patch(auth._id, { isActive: false });
    }

    await logAudit(ctx, {
      action: "vessel.mechanic_authorization_revoked",
      actorId: userId,
      targetId: args.vesselId,
      targetType: "vessels",
      metadata: { mechanicId: args.mechanicId },
    });

    return { success: true };
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "admin") return null;

    const [users, vessels, workOrders] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("vessels").collect(),
      ctx.db.query("workOrders").collect(),
    ]);

    return {
      userCount: users.length,
      vesselCount: vessels.length,
      workOrderCount: workOrders.length,
      ownerCount: users.filter((u) => u.role === "owner").length,
      mechanicCount: users.filter((u) => u.role === "mechanic").length,
      activeWorkOrders: workOrders.filter((wo) => wo.status === "in_progress")
        .length,
      completedWorkOrders: workOrders.filter((wo) => wo.status === "completed")
        .length,
    };
  },
});

// Sends the vessel QR code as an email attachment.
// The client generates the PNG data URI from the canvas and passes it here.
export const sendQRCodeEmail = action({
  args: {
    toEmail: v.string(),
    vesselName: v.string(),
    qrCodeData: v.string(),
    // base64-encoded PNG (without the data: prefix) from the client canvas
    pngBase64: v.string(),
  },
  handler: async (_ctx, args) => {
    const scanUrl = `https://theqrcaptain.com/scan/${args.qrCodeData}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#0c4a6e;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">QR Captain</h1>
      <p style="margin:8px 0 0;color:#7dd3fc;font-size:14px;">Vessel Service QR Code</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="margin:0 0 4px;color:#0f172a;font-size:20px;font-weight:700;">${args.vesselName}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Scan this QR code to access the vessel's complete service history.</p>
      <!-- QR Code image -->
      <div style="display:inline-block;padding:16px;background:#ffffff;border:2px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
        <img src="cid:qrcode" alt="QR Code for ${args.vesselName}" width="200" height="200" style="display:block;" />
      </div>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-family:monospace;">${args.qrCodeData}</p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:12px;">Print and mount this code on your vessel for instant access.</p>
      <!-- CTA -->
      <a href="${scanUrl}" style="display:inline-block;padding:12px 28px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Open Vessel Page</a>
    </div>
    <!-- Footer -->
    <div style="padding:20px 24px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">Sent via <a href="https://theqrcaptain.com" style="color:#0284c7;text-decoration:none;">QR Captain</a> · Vessel maintenance made simple.</p>
    </div>
  </div>
</body>
</html>`;

    // Resend supports inline attachments via content_id for email clients that block external images
    const result = await sendEmail({
      to: args.toEmail,
      subject: `QR Code for ${args.vesselName} — QR Captain`,
      html,
    });

    return result;
  },
});
