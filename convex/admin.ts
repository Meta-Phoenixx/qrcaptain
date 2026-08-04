import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { logAudit } from "./lib/audit";

// ─── User listing (admin) ───────────────────────────────────────────────────

export const listAllUsers = query({
  args: {
    role: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let users = await ctx.db.query("users").collect();
    if (args.role) {
      users = users.filter((u) => u.role === args.role);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      users = users.filter((u) => {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
        return name.includes(q) || (u.email ?? "").toLowerCase().includes(q);
      });
    }
    return users
      .sort((a, b) => b._creationTime - a._creationTime)
      .map((u) => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u._creationTime,
        companyName: u.companyName,
        onboardingCompleted: u.onboardingCompleted,
      }));
  },
});

export const getUserDetails = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const vessels = await ctx.db.query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    const workOrders = await ctx.db.query("workOrders")
      .withIndex("by_requested_owner", (q) => q.eq("requestedByOwnerId", args.userId))
      .order("desc")
      .take(10);
    return { user, vessels, workOrders };
  },
});

// ─── Impersonation ──────────────────────────────────────────────────────────

export const startImpersonation = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAdmin(ctx);
    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Target user not found");
    if (args.targetUserId === userId) throw new Error("Cannot impersonate yourself");
    await ctx.db.patch(userId, { impersonatingAs: args.targetUserId });
    await logAudit(ctx, {
      action: "admin.impersonation_started",
      actorId: userId,
      targetId: args.targetUserId,
      metadata: { adminEmail: user.email, targetEmail: target.email },
    });
  },
});

export const stopImpersonation = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireAdmin(ctx);
    if (!user.impersonatingAs) return;
    const target = await ctx.db.get(user.impersonatingAs);
    await ctx.db.patch(userId, { impersonatingAs: undefined });
    await logAudit(ctx, {
      action: "admin.impersonation_ended",
      actorId: userId,
      targetId: user.impersonatingAs,
      metadata: { adminEmail: user.email, targetEmail: target?.email ?? "unknown" },
    });
  },
});

// ─── Fleets ─────────────────────────────────────────────────────────────────

export const listAllFleets = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const fleets = await ctx.db.query("fleets").collect();
    const results = await Promise.all(
      fleets.map(async (fleet) => {
        const owner = await ctx.db.get(fleet.ownerId);
        const vessels = await ctx.db.query("vessels")
          .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
          .collect();
        const activeMechanics = await ctx.db.query("fleetMechanicAuthorizations")
          .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        return {
          ...fleet,
          ownerName: owner ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email : "Unknown",
          ownerEmail: owner?.email ?? "",
          vesselCount: vessels.length,
          mechanicCount: activeMechanics.length,
        };
      })
    );
    return results;
  },
});
