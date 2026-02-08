import { Email } from "@convex-dev/auth/providers/Email";

// Convex environment variables are available via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

// Generate a random numeric OTP using Web Crypto API (available in Convex runtime)
function generateOTP(length: number): string {
  const digits = "0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => digits[byte % digits.length]).join("");
}

export const ResendOTPPasswordReset = Email({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    return generateOTP(8);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    // Use Resend's REST API directly (avoids Node.js-only SDK deps)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL ?? "QR Captain <noreply@qrcaptain.com>",
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Could not send password reset email: ${errorData}`);
    }
  },
});
