import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const TICKET_TIERS = {
  single: { count: 1, amount: 5 },
  popular: { count: 6, amount: 20 },
  value: { count: 15, amount: 50 },
  bigdog: { count: 40, amount: 100 },
} as const;

export const submitRaffleEntry = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    ticketTier: v.union(
      v.literal("single"),
      v.literal("popular"),
      v.literal("value"),
      v.literal("bigdog")
    ),
  },
  handler: async (ctx, args) => {
    const tier = TICKET_TIERS[args.ticketTier];

    const id = await ctx.db.insert("raffleEntries", {
      name: args.name,
      phone: args.phone,
      email: args.email.toLowerCase(),
      ticketTier: args.ticketTier,
      ticketCount: tier.count,
      amount: tier.amount,
      confirmationEmailSent: false,
      createdAt: Date.now(),
    });

    // Schedule confirmation email
    await ctx.scheduler.runAfter(0, internal.emails.sendRaffleConfirmation, {
      entryId: id,
      name: args.name,
      email: args.email.toLowerCase(),
      ticketTier: args.ticketTier,
      ticketCount: tier.count,
      amount: tier.amount,
    });

    return { success: true, id, ticketCount: tier.count, amount: tier.amount };
  },
});

export const listAllRaffleEntries = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") throw new Error("Admin access required");

    const entries = await ctx.db.query("raffleEntries").collect();
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getRaffleStats = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("raffleEntries").collect();
    const potTotal = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalEntries = entries.length;
    const totalTickets = entries.reduce((sum, e) => sum + e.ticketCount, 0);

    return {
      potTotal,
      totalEntries,
      totalTickets,
      winnerPot: Math.floor(potTotal / 2),
      causePot: Math.ceil(potTotal / 2),
    };
  },
});
