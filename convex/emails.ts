import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const TIER_LABELS: Record<string, string> = {
  single: "$5 — 1 Ticket",
  popular: "$20 — 6 Tickets (Most Popular)",
  value: "$50 — 15 Tickets (Best Value)",
  bigdog: "$100 — 40 Tickets (Big Dog Entry)",
};

export const sendRaffleConfirmation = internalAction({
  args: {
    entryId: v.id("raffleEntries"),
    name: v.string(),
    email: v.string(),
    ticketTier: v.string(),
    ticketCount: v.number(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("AUTH_RESEND_KEY not set, skipping raffle confirmation email");
      return;
    }

    const tierLabel = TIER_LABELS[args.ticketTier] ?? args.ticketTier;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL ?? "QR Captain <noreply@qrcaptain.com>",
        to: [args.email],
        subject: "You're In! Biggest Trout 50/50 Raffle Confirmation",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">From the Water to a Worthy Cause</h1>
              <p style="color: #0284c7; margin: 0; font-size: 16px; font-weight: 600;">Biggest Trout — 50/50 Raffle</p>
              <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Presented by Walden Marine & QR Captain</p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hey ${args.name}! 🎣</p>
              <p style="margin: 0 0 16px; color: #333;">You've been entered into the <strong>Biggest Trout 50/50 Raffle</strong> at the Safety Harbor Slam!</p>

              <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
                <p style="margin: 0 0 4px; font-weight: 600; color: #075985;">Your Selection</p>
                <p style="margin: 0; color: #0369a1; font-size: 18px; font-weight: bold;">${tierLabel}</p>
              </div>

              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 4px; font-weight: 600; color: #92400e;">⚠️ Important — Pick Up Your Tickets</p>
                <p style="margin: 0; color: #78350f;">You must <strong>pick up and purchase your tickets in person</strong> at the Captain's Meeting:</p>
                <p style="margin: 8px 0 0; color: #78350f; font-weight: 600;">
                  📅 Friday, March 27th at 6:30 PM<br/>
                  📍 Backwater Provisions — Safety Harbor
                </p>
              </div>

              <p style="margin: 0; color: #666; font-size: 14px;">
                Half the pot goes to the biggest trout winner. The other half supports
                <strong>Cass Walden</strong>, a student in the Moody Aviation Program training
                to become a missionary pilot serving remote communities worldwide.
              </p>
            </div>

            <div style="text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 0 0 4px;">Catch Big. Win Big. Give Back.</p>
              <p style="margin: 0;">Walden Marine & QR Captain — Forged in Saltwater</p>
              <p style="margin: 4px 0 0;">📞 813-965-8711 · 📧 waldenmarine@gmail.com</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Failed to send raffle confirmation: ${errorData}`);
      return;
    }

    // Mark confirmation as sent
    await ctx.runMutation(internal.emails.markRaffleEmailSent, {
      entryId: args.entryId,
    });
  },
});

export const markRaffleEmailSent = internalMutation({
  args: { entryId: v.id("raffleEntries") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { confirmationEmailSent: true });
  },
});

export const sendWaitlistConfirmation = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    roleInterest: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("AUTH_RESEND_KEY not set, skipping waitlist confirmation email");
      return;
    }

    const roleLabel =
      args.roleInterest === "owner" ? "Boat Owner"
      : args.roleInterest === "mechanic" ? "Marine Mechanic"
      : "Boat Owner & Marine Mechanic";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL ?? "QR Captain <noreply@qrcaptain.com>",
        to: [args.email],
        subject: "You're on the QR Captain Waitlist! ⚓",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">QR Captain</h1>
              <p style="color: #0284c7; margin: 0; font-size: 14px;">Complete Vessel Maintenance Tracking</p>
            </div>

            <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Welcome aboard, ${args.name}! ⚓</p>
              <p style="margin: 0 0 16px; color: #333;">
                You've been added to the QR Captain waitlist as a <strong>${roleLabel}</strong>.
                We're building the future of vessel maintenance tracking and you'll be among the first to know when we launch.
              </p>

              <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
                <p style="margin: 0 0 4px; font-weight: 600; color: #075985;">Beta Program — Q2 2026</p>
                <p style="margin: 0; color: #0369a1; font-size: 14px;">
                  As a waitlist member, you'll get priority access to our Beta Program launching in Q2 2026.
                  Early adopters will help shape the platform and earn founding member status.
                </p>
              </div>

              <p style="margin: 0; color: #666; font-size: 14px;">
                We'll keep you updated on our progress. In the meantime, stay tuned for exciting announcements!
              </p>
            </div>

            <div style="text-align: center; color: #999; font-size: 12px;">
              <p style="margin: 0;">QR Captain — Forged in Saltwater</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Failed to send waitlist confirmation: ${errorData}`);
    }
  },
});
