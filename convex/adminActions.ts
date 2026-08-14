import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";
import { logAudit } from "./lib/audit";

declare const process: { env: Record<string, string | undefined> };

export const _getAdminAndTarget = internalMutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args): Promise<{ actorId: string; targetEmail: string }> => {
    const { userId: actorId } = await requireAdmin(ctx);
    const target = await ctx.db.get(args.targetUserId);
    if (!target?.email) throw new Error("User not found or has no email");
    return { actorId, targetEmail: target.email };
  },
});

export const _recordPasswordResetAudit = internalMutation({
  args: { actorId: v.id("users"), targetUserId: v.id("users"), email: v.string() },
  handler: async (ctx, args) => {
    await logAudit(ctx, {
      action: "admin.password_reset_requested" as const,
      actorId: args.actorId,
      targetId: args.targetUserId,
      after: { email: args.email },
    });
  },
});

// Admin-initiated password reset: sends notification email via Resend
// Must be an action (not mutation) because it makes an HTTP fetch to Resend.
export const adminRequestPasswordReset = action({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { actorId, targetEmail } = await ctx.runMutation(
      internal.adminActions._getAdminAndTarget,
      { targetUserId: args.targetUserId }
    ) as { actorId: string; targetEmail: string };

    const apiKey = process.env.AUTH_RESEND_KEY;
    const fromEmail = process.env.AUTH_EMAIL ?? "QR Captain <noreply@qrcaptain.com>";

    if (!apiKey) {
      console.log(`[DEV] Admin password reset requested for ${targetEmail} — no Resend key, skipping send`);
      return { success: true, email: targetEmail };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [targetEmail],
        subject: "Reset your QR Captain password",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px;">QR Captain</h1>
              <p style="color: #666; margin: 0;">Password Reset</p>
            </div>
            <p style="color: #333; margin: 0 0 16px;">
              Your account administrator has requested a password reset for your QR Captain account.
            </p>
            <p style="color: #333; margin: 0 0 24px;">
              Please visit the QR Captain sign-in page and use the <strong>Forgot Password</strong> link to set a new password for your account (<strong>${targetEmail}</strong>).
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${process.env.FRONTEND_URL ?? "https://theqrcaptain.com"}/signin"
                style="display: inline-block; background: #0ea5e9; color: white; font-weight: bold; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px;">
                Go to Sign In
              </a>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center; margin: 0;">
              If you did not expect this email, please contact support at support@theqrcaptain.com.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Resend] Failed to send admin password reset to ${targetEmail}:`, err);
      throw new Error(`Failed to send email: ${err}`);
    }

    await ctx.runMutation(internal.adminActions._recordPasswordResetAudit, {
      actorId: actorId as any,
      targetUserId: args.targetUserId,
      email: targetEmail,
    });

    return { success: true, email: targetEmail };
  },
});
