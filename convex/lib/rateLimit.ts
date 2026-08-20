import { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
}

/**
 * Sliding-window rate limiter backed by the rateLimitBuckets table.
 * Throws a ConvexError with code RATE_LIMITED if the limit is exceeded.
 * Key should be "action:identifier", e.g. "waitlist:user@email.com".
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  { limit, windowMs }: RateLimitConfig
): Promise<void> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const bucket = await ctx.db
    .query("rateLimitBuckets")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!bucket || bucket.windowStart < windowStart) {
    if (bucket) {
      await ctx.db.patch(bucket._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimitBuckets", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (bucket.count >= limit) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    });
  }

  await ctx.db.patch(bucket._id, { count: bucket.count + 1 });
}

// Pre-defined configs
export const RATE_LIMITS = {
  // Public unauthenticated endpoints — per email address
  waitlistSignup: { limit: 3, windowMs: 60 * 60 * 1000 },    // 3/hour
  donation: { limit: 5, windowMs: 60 * 60 * 1000 },           // 5/hour
  raffleEntry: { limit: 3, windowMs: 60 * 60 * 1000 },        // 3/hour

  // Authenticated endpoints — per user
  createVessel: { limit: 20, windowMs: 60 * 60 * 1000 },      // 20/hour
  workOrderRequest: { limit: 30, windowMs: 60 * 60 * 1000 },  // 30/hour
  sendQrEmail: { limit: 10, windowMs: 60 * 60 * 1000 },       // 10/hour
} as const;
