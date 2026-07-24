import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { computeServicePrediction } from "./lib/servicePredictor";
import { getFileUrl } from "./lib/fileStorage";

export const getFleetDashboard = query({
  args: { fleetId: v.id("fleets") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireAuth(ctx);
    const fleet = await ctx.db.get(args.fleetId);
    if (!fleet) return null;

    // Allow: admin, fleet owner, or mechanic authorized on any vessel in the fleet
    if (user.role !== "admin" && fleet.ownerId !== userId) {
      if (user.role === "mechanic") {
        const fleetAuth = await ctx.db.query("fleetMechanicAuthorizations")
          .withIndex("by_fleet_mechanic", (q) => q.eq("fleetId", args.fleetId).eq("mechanicId", userId))
          .first();
        // Also check vessel-level authorizations within this fleet
        if (!fleetAuth) {
          const fleetVessels = await ctx.db.query("vessels")
            .withIndex("by_fleet", (q) => q.eq("fleetId", args.fleetId))
            .collect();
          const vesselIds = fleetVessels.map((v) => v._id);
          const vesselAuths = await Promise.all(
            vesselIds.map((vid) =>
              ctx.db.query("mechanicAuthorizations")
                .withIndex("by_vessel_mechanic", (q) => q.eq("vesselId", vid).eq("mechanicId", userId))
                .filter((q) => q.eq(q.field("isActive"), true))
                .first()
            )
          );
          if (!vesselAuths.some(Boolean)) return null;
        }
      } else {
        return null;
      }
    }

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

      // Mechanic coverage + name
      const mechAuth = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vessel._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      const mechUser = mechAuth ? await ctx.db.get(mechAuth.mechanicId) : null;
      const mechPhotoUrl = mechUser?.profilePhotoStorageId
        ? await getFileUrl(ctx, mechUser.profilePhotoStorageId)
        : null;

      // Vessel image
      const vesselImageUrl = vessel.imageStorageId
        ? await getFileUrl(ctx, vessel.imageStorageId)
        : null;

      // Next scheduled service date (earliest upcoming across all equipment)
      const upcomingDates = equipment
        .map((eq) => eq.nextServiceDate)
        .filter((d): d is number => typeof d === "number" && d > now);
      const nextServiceDate = upcomingDates.length > 0 ? Math.min(...upcomingDates) : null;

      // Parts flagged (needs_attention condition)
      const partsFlaggedCount = equipment.filter((eq) => eq.conditionStatus === "needs_attention").length;

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
        mechanicName: mechUser ? `${mechUser.firstName ?? ""} ${mechUser.lastName ?? ""}`.trim() : null,
        mechanicCompany: mechUser?.companyName ?? null,
        mechanicPhotoUrl: mechPhotoUrl,
        vesselImageUrl,
        insuranceExpiry: vessel.insuranceInfo?.expiryDate ?? null,
        hasInsurance: !!vessel.insuranceInfo,
        currentEngineHours,
        engineManufacturer,
        nextServiceDate,
        partsFlaggedCount,
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
    const coveredVessels = vesselSummaries.filter((v) => v.hasMechanic).length;

    // Primary assigned mechanic (most frequently assigned across the fleet)
    const mechCount: Record<string, { count: number; name: string; company: string | null; photoUrl: string | null }> = {};
    for (const v of vesselSummaries) {
      if (v.mechanicName) {
        const key = v.mechanicName;
        if (!mechCount[key]) mechCount[key] = { count: 0, name: v.mechanicName, company: v.mechanicCompany ?? null, photoUrl: v.mechanicPhotoUrl ?? null };
        mechCount[key].count++;
      }
    }
    const primaryMechanic = Object.values(mechCount).sort((a, b) => b.count - a.count)[0] ?? null;

    // Estimated cost totals from open work orders
    const allWorkOrderDocs = await Promise.all(
      vessels.map((v) => ctx.db.query("workOrders").withIndex("by_vessel", (q) => q.eq("vesselId", v._id)).collect())
    );
    let approvedCost = 0;
    let pendingCost = 0;
    for (const wos of allWorkOrderDocs) {
      for (const wo of wos) {
        if (wo.status === "in_progress" && wo.quotedTotalEstimate) approvedCost += wo.quotedTotalEstimate;
        else if ((wo.status === "quoted" || wo.status === "quote_requested") && wo.quotedTotalEstimate) pendingCost += wo.quotedTotalEstimate;
      }
    }
    const totalEstimatedCost = approvedCost + pendingCost;

    // Fleet-wide aggregates
    const totalPartsFlagged = vesselSummaries.reduce((s, v) => s + v.partsFlaggedCount, 0);
    const hoursArr = vesselSummaries.map((v) => v.currentEngineHours).filter((h): h is number => h !== null);
    const avgEngineHours = hoursArr.length > 0 ? Math.round(hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length) : null;

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
      coveredVessels,
      totalPartsFlagged,
      avgEngineHours,
      insuranceExpiringSoon,
      insuranceMissing,
      warrantyExpiringSoon,
      primaryMechanic,
      approvedCost,
      pendingCost,
      totalEstimatedCost,
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

    const ownerFleets = await ctx.db.query("fleets").collect();
    type Fleet = (typeof ownerFleets)[number];
    let fleets: Fleet[];
    if (user.role === "admin") {
      fleets = ownerFleets;
    } else if (user.role === "mechanic") {
      // Fleets via fleet-level mechanic authorizations
      const fleetAuths = await ctx.db.query("fleetMechanicAuthorizations")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .collect();
      const fleetIdsFromFleetAuth = fleetAuths.map((a) => a.fleetId);

      // Fleets via vessel-level mechanic authorizations
      const vesselAuths = await ctx.db.query("mechanicAuthorizations")
        .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      const vesselFleetIds = await Promise.all(
        vesselAuths.map(async (a) => {
          const vessel = await ctx.db.get(a.vesselId);
          return vessel?.fleetId ?? null;
        })
      );

      const allFleetIds = [...new Set([...fleetIdsFromFleetAuth, ...vesselFleetIds.filter((id): id is NonNullable<typeof id> => id !== null)])];
      const fetched = await Promise.all(allFleetIds.map((id) => ctx.db.get(id)));
      fleets = fetched.filter((f): f is Fleet => f !== null);
    } else {
      fleets = await ctx.db.query("fleets").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect();
    }

    return Promise.all(fleets.map(async (fleet) => {
      const vessels = await ctx.db.query("vessels").withIndex("by_fleet", (q) => q.eq("fleetId", fleet._id)).collect();
      return { _id: fleet._id, name: fleet.name, fleetType: fleet.fleetType, vesselCount: vessels.length };
    }));
  },
});
