import { query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const listAllFleets = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const fleets = await ctx.db.query("fleets").collect();
    const results = await Promise.all(
      fleets.map(async (fleet) => {
        const owner = await ctx.db.get(fleet.ownerId);
        const vessels = await ctx.db.query("vessels")
          .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
          .collect();
        const activeMechanics = await ctx.db.query("fleetMechanicAuthorizations")
          .withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        return {
          ...fleet,
          ownerName: owner ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email : "Unknown",
          ownerEmail: owner?.email ?? "",
          vesselCount: vessels.length,
          mechanicCount: activeMechanics.length,
        };
      })
    );
    return results;
  },
});
