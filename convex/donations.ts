import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";
import { Errors } from "./lib/errors";

// Intentionally public — event donation form, no account required.
// Input is validated (name ≤ 100 chars, email format + length, amount > 0).
export const submitDonation = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    amount: v.number(),
    customAmount: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.name.trim().length === 0 || args.name.length > 100) {
      return { success: false, error: "invalid_name" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email) || args.email.length > 254) {
      return { success: false, error: "invalid_email" };
    }
    if (args.amount <= 0) {
      return { success: false, error: "invalid_amount" };
    }

    const id = await ctx.db.insert("donationEntries", {
      name: args.name,
      email: args.email.toLowerCase(),
      phone: args.phone,
      amount: args.amount,
      customAmount: args.customAmount,
      message: args.message,
      confirmationEmailSent: false,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendDonationConfirmation, {
      entryId: id,
      name: args.name,
      email: args.email.toLowerCase(),
      amount: args.amount,
    });

    return { success: true, id, amount: args.amount };
  },
});

export const listAllDonations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const entries = await ctx.db.query("donationEntries").collect();
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateDonation = mutation({
  args: {
    entryId: v.id("donationEntries"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.amount <= 0) throw Errors.validation("Amount must be greater than 0");

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw Errors.notFound("Donation");

    const oldAmount = entry.amount;
    await ctx.db.patch(args.entryId, { amount: args.amount });

    // Send update notification email
    await ctx.scheduler.runAfter(0, internal.emails.sendDonationUpdateNotification, {
      name: entry.name,
      email: entry.email,
      oldAmount,
      newAmount: args.amount,
    });

    return { success: true };
  },
});

export const deleteDonation = mutation({
  args: {
    entryId: v.id("donationEntries"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw Errors.notFound("Donation");

    await ctx.db.delete(args.entryId);

    // Send deletion notification email
    await ctx.scheduler.runAfter(0, internal.emails.sendDonationDeleteNotification, {
      name: entry.name,
      email: entry.email,
      amount: entry.amount,
    });

    return { success: true };
  },
});

// Intentionally public — aggregate totals only, no PII. Used for public fundraising widget.
export const getDonationStats = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("donationEntries").collect();
    const totalRaised = entries.reduce((sum, e) => sum + e.amount, 0);
    return {
      totalRaised,
      donorCount: entries.length,
    };
  },
});
