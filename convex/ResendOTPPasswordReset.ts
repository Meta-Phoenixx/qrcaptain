import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

// Convex environment variables are available via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "QR Captain <noreply@qrcaptain.com>",
      to: [email],
      subject: "Reset your QR Captain password",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px;">QR Captain</h1>
            <p style="color: #666; margin: 0;">Password Reset Request</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; color: #333;">Your password reset code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb; padding: 12px; background: white; border-radius: 8px; display: inline-block;">
              ${token}
            </div>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center; margin: 0;">
            This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error("Could not send password reset email");
    }
  },
});
