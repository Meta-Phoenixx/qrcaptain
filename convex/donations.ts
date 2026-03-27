import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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
