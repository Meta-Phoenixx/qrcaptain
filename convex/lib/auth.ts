import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type AnyCtx = QueryCtx | MutationCtx;
type UserRole = "admin" | "owner" | "mechanic" | "fleet_manager" | "captain";

/**
 * Returns the authenticated user, or null if unauthenticated.
 * Use in queries where returning empty data is the correct behavior.
 */
export async function getAuthenticatedUser(
  ctx: AnyCtx
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return ctx.db.get(userId);
}

/**
 * Returns the authenticated user and their ID.
 * Throws if the caller is not authenticated.
 * Use in mutations where unauthenticated access must be an error.
 */
export async function requireAuth(
  ctx: AnyCtx
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");

  return { userId, user };
}

/**
 * Requires the caller to have one of the specified roles.
 * Throws if unauthenticated or wrong role.
 */
export async function requireRole(
  ctx: AnyCtx,
  ...roles: UserRole[]
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const { userId, user } = await requireAuth(ctx);
  if (!roles.includes(user.role as UserRole)) {
    throw new ConvexError("Access denied");
  }
  return { userId, user };
}

/** Requires owner OR fleet_manager role (both are "vessel owners"). */
export async function requireOwnerClass(
  ctx: AnyCtx
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  return requireRole(ctx, "owner", "fleet_manager");
}

/** Shorthand: requires fleet_manager role. */
export async function requireFleetManager(
  ctx: AnyCtx
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  return requireRole(ctx, "fleet_manager", "admin");
}

/** Shorthand: requires admin role. */
export async function requireAdmin(
  ctx: AnyCtx
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  return requireRole(ctx, "admin");
}

/**
 * Requires the caller to be the owner of the vessel, or an admin.
 * Returns the vessel as well so callers don't need to re-fetch it.
 */
export async function requireVesselOwnerOrAdmin(
  ctx: AnyCtx,
  vesselId: Id<"vessels">
): Promise<{
  userId: Id<"users">;
  user: Doc<"users">;
  vessel: Doc<"vessels">;
}> {
  const { userId, user } = await requireAuth(ctx);

  const vessel = await ctx.db.get(vesselId);
  if (!vessel) throw new ConvexError("Vessel not found");

  const isOwnerClass = user.role === "owner" || user.role === "fleet_manager";
  if (user.role !== "admin" && !(isOwnerClass && vessel.ownerId === userId)) {
    throw new ConvexError("Access denied");
  }

  return { userId, user, vessel };
}

/**
 * Requires the caller to be an authorized mechanic for the vessel, or an admin.
 */
export async function requireMechanicVesselAccess(
  ctx: AnyCtx,
  vesselId: Id<"vessels">
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const { userId, user } = await requireAuth(ctx);

  if (user.role === "admin") return { userId, user };

  if (user.role !== "mechanic") throw new ConvexError("Access denied");

  const auth = await ctx.db
    .query("mechanicAuthorizations")
    .withIndex("by_vessel_mechanic", (q) =>
      q.eq("vesselId", vesselId).eq("mechanicId", userId)
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!auth) throw new ConvexError("Access denied");

  return { userId, user };
}

/**
 * Requires the caller to be either the vessel owner or an authorized mechanic (or admin).
 * Used for read access to vessel details.
 */
export async function requireVesselReadAccess(
  ctx: AnyCtx,
  vesselId: Id<"vessels">
): Promise<{
  userId: Id<"users">;
  user: Doc<"users">;
  vessel: Doc<"vessels">;
}> {
  const { userId, user } = await requireAuth(ctx);

  const vessel = await ctx.db.get(vesselId);
  if (!vessel) throw new ConvexError("Vessel not found");

  if (user.role === "admin") return { userId, user, vessel };

  if (user.role === "owner" || user.role === "fleet_manager") {
    if (vessel.ownerId !== userId) throw new ConvexError("Access denied");
    return { userId, user, vessel };
  }

  if (user.role === "mechanic") {
    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!auth) throw new ConvexError("Access denied");
    return { userId, user, vessel };
  }

  if (user.role === "captain") {
    const assignment = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", (q) =>
        q.eq("vesselId", vesselId).eq("captainId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!assignment) throw new ConvexError("Access denied");
    return { userId, user, vessel };
  }

  throw new ConvexError("Access denied");
}
