/**
 * Stripe vendor module shell.
 *
 * Placeholder for future payment integration. All Stripe logic will live here
 * so domain files never import stripe directly or handle raw payment objects.
 *
 * When implementing:
 * 1. Add STRIPE_SECRET_KEY to Convex environment variables
 * 2. Replace stubs below with real Stripe API calls
 * 3. Domain files call these helpers — never stripe.* directly
 */

declare const process: { env: Record<string, string | undefined> };

export interface CreateCheckoutParams {
  customerId?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface CreatePaymentIntentParams {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

// ─── Stubs (replace with real Stripe calls) ──────────────────────────────────

export async function createCheckoutSession(
  _params: CreateCheckoutParams
): Promise<CheckoutResult> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("[stripe] STRIPE_SECRET_KEY not configured");
  }
  // TODO: implement Stripe Checkout Session creation
  throw new Error("[stripe] createCheckoutSession not yet implemented");
}

export async function createPaymentIntent(
  _params: CreatePaymentIntentParams
): Promise<PaymentIntentResult> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("[stripe] STRIPE_SECRET_KEY not configured");
  }
  // TODO: implement Stripe Payment Intent creation
  throw new Error("[stripe] createPaymentIntent not yet implemented");
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
