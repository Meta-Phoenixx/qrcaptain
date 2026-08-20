import { Email } from "@convex-dev/auth/providers/Email";

// Convex environment variables are available via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

// Generate a random numeric OTP using Web Crypto API with rejection sampling to eliminate modulo bias.
// digits.length = 10; 256 / 10 = 25.6, so bytes >= 250 would bias digits 0-5. Reject them.
function generateOTP(length: number): string {
  const digits = "0123456789";
  const threshold = 256 - (256 % digits.length); // 250
  const result: string[] = [];
  while (result.length < length) {
    const array = new Uint8Array(length - result.length + 4); // over-sample
    crypto.getRandomValues(array);
    for (const byte of array) {
      if (byte < threshold) {
        result.push(digits[byte % digits.length]);
        if (result.length === length) break;
      }
    }
  }
  return result.join("");
}

export const ResendOTPPasswordReset = Email({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  // Token expires after 15 minutes — matches the promise in the email body
  maxAge: 15 * 60,

  async generateVerificationToken() {
    return generateOTP(8);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    // In dev mode with no API key, log the OTP to Convex function logs
    // so you can complete the reset without email delivery.
    if (!provider.apiKey) {
      console.log(`[DEV] Password reset OTP for ${email}: ${token}`);
      return;
    }

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
      const errorBody = await response.text();
      // Log the full Resend error so it's visible in Convex dashboard logs
      console.error(`[Resend] Failed to send password reset to ${email}:`, errorBody);
      throw new Error(`Could not send password reset email: ${errorBody}`);
    }

    console.log(`[Resend] Password reset email sent to ${email}`);
  },
});
