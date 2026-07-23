import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { computeServicePrediction } from "./lib/servicePredictor";

export const getFleetDashboard = query({
  args: { fleetId: v.id("fleets") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) return null;
    if (user.role !== "admin" && fleet.ownerId !== userId) return null;

    const vessels = await ctx.db.query("vessels")
      .withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId))
      .collect();

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    let overdueCount = 0;
    let approachingCount = 0;
    let inMaintenanceCount = 0;
    let outOfServiceCount = 0;
    let inServiceCount = 0;
    let storageCount = 0;
    let healthyCount = 0;
    let insuranceExpiringSoon = 0;
    let insuranceMissing = 0;
    let warrantyExpiringSoon = 0;

    const vesselSummaries = await Promise.all(vessels.map(async (vessel) => {
      // Status counts
      switch (vessel.status ?? "in_service") {
        case "in_maintenance": inMaintenanceCount++; break;
        case "out_of_service": outOfServiceCount++; break;
        case "storage": storageCount++; break;
        default: inServiceCount++;
      }

      // Insurance
      if (!vessel.insuranceInfo) {
        insuranceMissing++;
      } else if (vessel.insuranceInfo.expiryDate - now < thirtyDaysMs) {
        insuranceExpiringSoon++;
      }

      // Equipment: warranty + service status
      const equipment = await ctx.db.query("vesselEquipment")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .collect();

      let vesselIsOverdue = false;
      let vesselIsApproaching = false;

      for (const eq of equipment) {
        // Warranty check
        if (eq.warrantyExpiry && eq.warrantyExpiry - now < ninetyDaysMs && eq.warrantyExpiry > now) {
          warrantyExpiringSoon++;
        }

        // Service prediction (propulsion only for urgency ranking)
        if (eq.category === "propulsion" && eq.serviceIntervalHours) {
          const logs = await ctx.db.query("engineHoursLog")
            .withIndex("by_equipment_recorded", (q) => q.eq("equipmentId", eq._id))
            .collect();
          const pred = computeServicePrediction(logs, eq.serviceIntervalHours, eq.lastServiceHours);
          if (pred.isOverdue) vesselIsOverdue = true;
          else if (pred.hoursUntilService !== null && pred.hoursUntilService <= 20) vesselIsApproaching = true;
        }
      }

      const vesselStatus = vessel.status ?? "in_service";
      if (vesselStatus === "out_of_service" || vesselStatus === "in_maintenance") {
        // Not healthy regardless of service schedule
      } else if (vesselIsOverdue) overdueCount++;
      else if (vesselIsApproaching) approachingCount++;
      else healthyCount++;

      // Aggregate current engine hours + manufacturer from propulsion equipment
      const propulsion = equipment.filter((eq) => eq.category === "propulsion");
      const currentEngineHours = propulsion.length > 0
        ? propulsion.reduce((sum, eq) => sum + (eq.currentHours ?? 0), 0)
        : null;
      const engineManufacturer = propulsion[0]?.manufacturer ?? null;

      // Active work orders
      const openWorkOrders = await ctx.db.query("workOrders")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "in_progress"),
            q.eq(q.field("status"), "quoted"),
            q.eq(q.field("status"), "quote_requested"),
          )
        )
        .collect();

      // Unresolved captain reports
      const openReports = await ctx.db.query("captainTripReports")
        .withIndex("by_vessel_unresolved", (q) => q.eq("vesselId", vessel._id).eq("isResolved", false))
        .collect();

      // Mechanic coverage
      const mechAuth = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      return {
        vesselId: vessel._id,
        name: vessel.name,
        make: vessel.make,
        model: vessel.model,
        year: vessel.year,
        status: vessel.status ?? "in_service",
        isOverdue: vesselIsOverdue,
        isApproaching: vesselIsApproaching,
        openWorkOrderCount: openWorkOrders.length,
        openReportCount: openReports.length,
        hasMechanic: !!mechAuth,
        insuranceExpiry: vessel.insuranceInfo?.expiryDate ?? null,
        hasInsurance: !!vessel.insuranceInfo,
        currentEngineHours,
        engineManufacturer,
      };
    }));

    // Fleet health score: % of non-storage vessels that are not overdue and not out-of-service
    const activeVessels = vessels.filter((v) => (v.status ?? "in_service") !== "storage");
    const healthScore = activeVessels.length > 0
      ? Math.round((healthyCount / activeVessels.length) * 100)
      : 100;

    // Total open work orders across fleet
    const allOpenWorkOrders = await Promise.all(
      vessels.map((v) =>
        ctx.db.query("workOrders")
          .withIndex("by_vessel", (q) => q.eq("vesselId", v._id))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "in_progress"),
              q.eq(q.field("status"), "quoted"),
              q.eq(q.field("status"), "quote_requested"),
            )
          )
          .collect()
      )
    );
    const totalOpenWorkOrders = allOpenWorkOrders.reduce((sum, wo) => sum + wo.length, 0);

    // Vessels without mechanic coverage
    const uncoveredVessels = vesselSummaries.filter((v) => !v.hasMechanic).length;

    return {
      fleet: { _id: fleet._id, name: fleet.name, fleetType: fleet.fleetType },
      healthScore,
      totalVessels: vessels.length,
      inServiceCount,
      inMaintenanceCount,
      outOfServiceCount,
      storageCount,
      overdueCount,
      approachingCount,
      totalOpenWorkOrders,
      uncoveredVessels,
      insuranceExpiringSoon,
      insuranceMissing,
      warrantyExpiringSoon,
      vessels: vesselSummaries.sort((a, b) => {
        // Sort: overdue > approaching > out_of_service > in_maintenance > in_service > storage
        const urgency = (v: typeof a) => {
          if (v.isOverdue) return 5;
          if (v.status === "out_of_service") return 4;
          if (v.isApproaching) return 3;
          if (v.status === "in_maintenance") return 2;
          return 0;
        };
        return urgency(b) - urgency(a);
      }),
    };
  },
});

export const listAllFleetsDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireAuth(ctx);
    const fleets = user.role === "admin"
      ? await ctx.db.query("fleets").collect()
      : await ctx.db.query("fleets").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect();

    return Promise.all(fleets.map(async (fleet) => {
      const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id)).collect();
      return { _id: fleet._id, name: fleet.name, fleetType: fleet.fleetType, vesselCount: vessels.length };
    }));
  },
});
