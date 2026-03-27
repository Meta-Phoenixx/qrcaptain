import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

export const getWaitlistCount = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query("waitlistSignups").collect();
    return signups.length;
  },
});
