import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendEmail, escapeHtml } from "./lib/email";

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
    const tierLabel = TIER_LABELS[args.ticketTier] ?? args.ticketTier;

    const result = await sendEmail({
      to: args.email,
      subject: "You're In! Biggest Trout 50/50 Raffle Confirmation",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">From the Water to a Worthy Cause</h1>
            <p style="color: #0284c7; margin: 0; font-size: 16px; font-weight: 600;">Biggest Trout — 50/50 Raffle</p>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Presented by Walden Marine & QR Captain</p>
          </div>

          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hey ${escapeHtml(args.name)}! 🎣</p>
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
              <strong>Cass Walden's</strong> missionary aviation training program, preparing
              pilots to serve remote communities worldwide.
            </p>
          </div>

          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0 0 4px;">Catch Big. Win Big. Give Back.</p>
            <p style="margin: 0;">Walden Marine & QR Captain — Forged in Saltwater</p>
            <p style="margin: 4px 0 0;">📞 813-965-8711 · 📧 waldenmarine@gmail.com</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send raffle confirmation:", result.error);
      return;
    }

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
  handler: async (_ctx, args) => {
    const roleLabel =
      args.roleInterest === "owner" ? "Boat Owner"
      : args.roleInterest === "mechanic" ? "Marine Mechanic"
      : "Boat Owner & Marine Mechanic";

    const result = await sendEmail({
      to: args.email,
      subject: "You're on the QR Captain Waitlist! ⚓",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">QR Captain</h1>
            <p style="color: #0284c7; margin: 0; font-size: 14px;">Complete Vessel Maintenance Tracking</p>
          </div>

          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Welcome aboard, ${escapeHtml(args.name)}! ⚓</p>
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
    });

    if (!result.success) {
      console.error("Failed to send waitlist confirmation:", result.error);
    }
  },
});

// ─── Donation Emails ──────────────────────────────────────────

export const sendDonationConfirmation = internalAction({
  args: {
    entryId: v.id("donationEntries"),
    name: v.string(),
    email: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const result = await sendEmail({
      to: args.email,
      subject: "Thank You for Your Donation! | Walden Marine x The QR Captain",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">From the Water to a Worthy Cause</h1>
            <p style="color: #0284c7; margin: 0; font-size: 16px; font-weight: 600;">Thank You for Your Donation</p>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Presented by Walden Marine & The QR Captain</p>
          </div>

          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Thank you, ${escapeHtml(args.name)}!</p>
            <p style="margin: 0 0 16px; color: #333;">
              Your generous donation of <strong>$${args.amount}</strong> is helping support
              <strong>Cass Walden's</strong> missionary aviation training program.
            </p>

            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #075985;">VIP Access Included</p>
              <p style="margin: 0; color: #0369a1; font-size: 14px;">
                As a thank you, you'll receive <strong>free VIP access</strong> to The QR Captain community
                when the platform launches. We'll be in touch with your access details!
              </p>
            </div>

            <p style="margin: 0; color: #666; font-size: 14px;">
              Your donation helps Cass complete his 5-year program training to become a missionary pilot,
              delivering disaster relief, medical supplies, and critical resources to remote communities
              that depend on aviation for survival.
            </p>
          </div>

          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0 0 4px;">From the Water to a Worthy Cause</p>
            <p style="margin: 0;">Walden Marine & The QR Captain — Forged in Saltwater</p>
            <p style="margin: 4px 0 0;">813-965-8711 · waldenmarine@gmail.com</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send donation confirmation:", result.error);
      return;
    }

    await ctx.runMutation(internal.emails.markDonationEmailSent, {
      entryId: args.entryId,
    });
  },
});

export const markDonationEmailSent = internalMutation({
  args: { entryId: v.id("donationEntries") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { confirmationEmailSent: true });
  },
});

// ─── Admin Update Notification Emails ──────────────────────────

export const sendDonationUpdateNotification = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    oldAmount: v.number(),
    newAmount: v.number(),
  },
  handler: async (_ctx, args) => {
    const result = await sendEmail({
      to: args.email,
      subject: "Donation Update | Walden Marine x The QR Captain",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">Donation Update</h1>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Walden Marine & The QR Captain</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hi ${escapeHtml(args.name)},</p>
            <p style="margin: 0 0 16px; color: #333;">
              Your donation record has been updated by our team.
            </p>
            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Previous amount: <strong>$${args.oldAmount}</strong></p>
              <p style="margin: 0; color: #075985; font-size: 18px; font-weight: bold;">Updated amount: $${args.newAmount}</p>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">
              If you have any questions about this change, please contact us at waldenmarine@gmail.com or 813-965-8711.
            </p>
          </div>
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Walden Marine & The QR Captain — Forged in Saltwater</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send donation update email:", result.error);
    }
  },
});

export const sendDonationDeleteNotification = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    amount: v.number(),
  },
  handler: async (_ctx, args) => {
    const result = await sendEmail({
      to: args.email,
      subject: "Donation Record Removed | Walden Marine x The QR Captain",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">Donation Record Update</h1>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Walden Marine & The QR Captain</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hi ${escapeHtml(args.name)},</p>
            <p style="margin: 0 0 16px; color: #333;">
              Your donation record of <strong>$${args.amount}</strong> has been removed from our system by our team.
            </p>
            <p style="margin: 0; color: #666; font-size: 14px;">
              If you believe this was done in error or have any questions, please contact us at waldenmarine@gmail.com or 813-965-8711.
            </p>
          </div>
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Walden Marine & The QR Captain — Forged in Saltwater</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send donation delete email:", result.error);
    }
  },
});

export const sendRaffleUpdateNotification = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    oldTicketCount: v.number(),
    newTicketCount: v.number(),
    ticketTier: v.string(),
  },
  handler: async (_ctx, args) => {
    const tierLabel = TIER_LABELS[args.ticketTier] ?? args.ticketTier;

    const result = await sendEmail({
      to: args.email,
      subject: "Raffle Ticket Update | Walden Marine x The QR Captain",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">Raffle Ticket Update</h1>
            <p style="color: #0284c7; margin: 0; font-size: 16px; font-weight: 600;">Biggest Trout — 50/50 Raffle</p>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Walden Marine & The QR Captain</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hi ${escapeHtml(args.name)},</p>
            <p style="margin: 0 0 16px; color: #333;">
              Your raffle ticket count has been updated by our team.
            </p>
            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #075985;">Tier: ${tierLabel}</p>
              <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Previous tickets: <strong>${args.oldTicketCount}</strong></p>
              <p style="margin: 0; color: #075985; font-size: 18px; font-weight: bold;">Updated tickets: ${args.newTicketCount}</p>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">
              If you have any questions, please contact us at waldenmarine@gmail.com or 813-965-8711.
            </p>
          </div>
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Walden Marine & The QR Captain — Forged in Saltwater</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send raffle update email:", result.error);
    }
  },
});

export const sendRaffleDeleteNotification = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    ticketCount: v.number(),
    ticketTier: v.string(),
  },
  handler: async (_ctx, args) => {
    const tierLabel = TIER_LABELS[args.ticketTier] ?? args.ticketTier;

    const result = await sendEmail({
      to: args.email,
      subject: "Raffle Entry Removed | Walden Marine x The QR Captain",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8f9fa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px; color: #0c4a6e;">Raffle Entry Update</h1>
            <p style="color: #666; margin: 8px 0 0; font-size: 13px;">Walden Marine & The QR Captain</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 16px; color: #333; font-size: 16px;">Hi ${escapeHtml(args.name)},</p>
            <p style="margin: 0 0 16px; color: #333;">
              Your raffle entry (${tierLabel}, ${args.ticketCount} ticket${args.ticketCount !== 1 ? "s" : ""}) has been removed from our system by our team.
            </p>
            <p style="margin: 0; color: #666; font-size: 14px;">
              If you believe this was done in error or have any questions, please contact us at waldenmarine@gmail.com or 813-965-8711.
            </p>
          </div>
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Walden Marine & The QR Captain — Forged in Saltwater</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Failed to send raffle delete email:", result.error);
    }
  },
});
