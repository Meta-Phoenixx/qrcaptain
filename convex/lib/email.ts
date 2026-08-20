/**
 * Email vendor module — wraps Resend REST API.
 *
 * All outbound email goes through sendEmail(). Nothing else in the codebase
 * should call the Resend API directly or know about the API key location.
 */

/** Escape user-supplied strings before interpolating into HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

declare const process: { env: Record<string, string | undefined> };

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "QR Captain <noreply@qrcaptain.com>";

export interface EmailAttachment {
  content: string;       // base64-encoded
  filename: string;
  content_type: string;
  content_id?: string;   // set to use as inline image via cid: in HTML
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error("[email] AUTH_RESEND_KEY not set — skipping send");
    return { success: false, error: "Email service not configured" };
  }

  const body = {
    from: payload.from ?? process.env.AUTH_EMAIL ?? DEFAULT_FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
    ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as { id?: string; error?: string };

    if (!response.ok) {
      console.error("[email] Resend API error", response.status, data);
      return { success: false, error: data.error ?? `HTTP ${response.status}` };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[email] Network error sending email", err);
    return { success: false, error: "Network error" };
  }
}
