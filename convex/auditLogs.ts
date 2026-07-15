import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { clampLimit } from "./lib/validate";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    actorId: v.optional(v.id("users")),
    targetType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = clampLimit(args.limit, 50, 200);

    let logs;

    if (args.action) {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .take(limit);
    } else if (args.actorId) {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_actor", (q) => q.eq("actorId", args.actorId!))
        .order("desc")
        .take(limit);
    } else if (args.targetType) {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_target", (q) => q.eq("targetType", args.targetType!))
        .order("desc")
        .take(limit);
    } else {
      logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_created")
        .order("desc")
        .take(limit);
    }

    const actorIds = [...new Set(logs.map((l) => l.actorId))];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const actorMap = new Map(
      actors.filter(Boolean).map((u) => [u!._id, u!])
    );

    return logs.map((log) => {
      const actor = actorMap.get(log.actorId);
      return {
        ...log,
        actorName: actor
          ? (actor.firstName && actor.lastName
              ? `${actor.firstName} ${actor.lastName}`
              : actor.name ?? actor.email ?? "Unknown")
          : "Unknown",
        actorEmail: actor?.email ?? null,
        actorRole: actor?.role ?? null,
      };
    });
  },
});

export const getDistinctActions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("auditLogs").take(1000);
    return [...new Set(logs.map((l) => l.action))].sort();
  },
});
