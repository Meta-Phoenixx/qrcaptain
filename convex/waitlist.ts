import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";
import { Errors } from "./lib/errors";

// Intentionally public — pre-launch marketing form, no auth required.
// Input is validated (name ≤ 100 chars, email format + length) and deduplicated by email.
export const submitWaitlistSignup = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    roleInterest: v.union(
      v.literal("owner"),
      v.literal("mechanic"),
      v.literal("both")
    ),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.name.trim().length === 0 || args.name.length > 100) {
      return { success: false, error: "invalid_name" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email) || args.email.length > 254) {
      return { success: false, error: "invalid_email" };
    }

    // Check for duplicate email
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { success: false, error: "already_registered" };
    }

    const id = await ctx.db.insert("waitlistSignups", {
      name: args.name,
      email: args.email.toLowerCase(),
      roleInterest: args.roleInterest,
      source: args.source,
      createdAt: Date.now(),
    });

    // Schedule confirmation email
    await ctx.scheduler.runAfter(0, internal.emails.sendWaitlistConfirmation, {
      name: args.name,
      email: args.email.toLowerCase(),
      roleInterest: args.roleInterest,
    });

    return { success: true, id };
  },
});

export const listAllWaitlistSignups = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const entries = await ctx.db.query("waitlistSignups").collect();
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query("waitlistSignups").collect();
    return signups.length;
  },
});
