import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Request access to a vessel (mechanic scans QR code)
export const requestAccess = mutation({
  args: {
    vesselId: v.id("vessels"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can request access");
    }

    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel) throw new Error("Vessel not found");

    // Check if already has active authorization
    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingAuth) {
      return { 
        status: "already_authorized", 
        message: "You already have access to this vessel" 
      };
    }

    // Check if there's already a pending request
    const existingRequest = await ctx.db
      .query("accessRequests")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      return { 
        status: "pending", 
        requestId: existingRequest._id,
        message: "You already have a pending request for this vessel" 
      };
    }

    // Create the access request
    const requestId = await ctx.db.insert("accessRequests", {
      vesselId: args.vesselId,
      mechanicId: userId,
      ownerId: vessel.ownerId,
      status: "pending",
      requestMessage: args.message,
      requestedAt: Date.now(),
    });

    // Create notification for the owner
    const owner = await ctx.db.get(vessel.ownerId);
    await ctx.db.insert("notifications", {
      userId: vessel.ownerId,
      type: "access_request",
      title: "New Access Request",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || "A mechanic"} is requesting access to ${vessel.name}`,
      relatedId: requestId,
      relatedType: "accessRequest",
      isRead: false,
      createdAt: Date.now(),
    });

    return { 
      status: "requested", 
      requestId,
      message: "Access request sent to the vessel owner" 
    };
  },
});

// Respond to an access request (owner approves or denies)
export const respondToRequest = mutation({
  args: {
    requestId: v.id("accessRequests"),
    approved: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Verify the user is the owner
    if (request.ownerId !== userId) {
      throw new Error("Not authorized to respond to this request");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const vessel = await ctx.db.get(request.vesselId);
    const mechanic = await ctx.db.get(request.mechanicId);
    const owner = await ctx.db.get(userId);

    // Update the request
    await ctx.db.patch(args.requestId, {
      status: args.approved ? "approved" : "denied",
      responseMessage: args.message,
      respondedAt: Date.now(),
    });

    if (args.approved) {
      // Create or update mechanic authorization
      const existingAuth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", request.vesselId).eq("mechanicId", request.mechanicId)
        )
        .first();

      if (existingAuth) {
        await ctx.db.patch(existingAuth._id, { 
          isActive: true,
          authorizedAt: Date.now(),
          authorizedBy: userId,
        });
      } else {
        await ctx.db.insert("mechanicAuthorizations", {
          vesselId: request.vesselId,
          mechanicId: request.mechanicId,
          authorizedAt: Date.now(),
          authorizedBy: userId,
          isActive: true,
        });
      }

      // Notify mechanic of approval
      await ctx.db.insert("notifications", {
        userId: request.mechanicId,
        type: "access_approved",
        title: "Access Approved",
        message: `${owner?.firstName && owner?.lastName ? `${owner.firstName} ${owner.lastName}` : "The owner"} has approved your access to ${vessel?.name || "the vessel"}${args.message ? `: "${args.message}"` : ""}`,
        relatedId: request.vesselId,
        relatedType: "vessel",
        isRead: false,
        createdAt: Date.now(),
      });
    } else {
      // Notify mechanic of denial
      await ctx.db.insert("notifications", {
        userId: request.mechanicId,
        type: "access_denied",
        title: "Access Denied",
        message: `${owner?.firstName && owner?.lastName ? `${owner.firstName} ${owner.lastName}` : "The owner"} has denied your access to ${vessel?.name || "the vessel"}${args.message ? `: "${args.message}"` : ""}`,
        relatedId: args.requestId,
        relatedType: "accessRequest",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get pending requests for an owner
export const getPendingRequestsForOwner = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    const requests = await ctx.db
      .query("accessRequests")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerId", userId).eq("status", "pending")
      )
      .collect();

    // Enrich with vessel and mechanic info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const vessel = await ctx.db.get(request.vesselId);
        const mechanic = await ctx.db.get(request.mechanicId);
        
        return {
          ...request,
          vessel: vessel ? {
            _id: vessel._id,
            name: vessel.name,
            make: vessel.make,
            model: vessel.model,
            year: vessel.year,
          } : null,
          mechanic: mechanic ? {
            _id: mechanic._id,
            name: mechanic.firstName && mechanic.lastName 
              ? `${mechanic.firstName} ${mechanic.lastName}` 
              : mechanic.name,
            email: mechanic.email,
            companyName: mechanic.companyName,
            licenseNumber: mechanic.licenseNumber,
          } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Get request status for a mechanic
export const getMyRequestStatus = query({
  args: { vesselId: v.id("vessels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return null;

    // Check if already authorized
    const existingAuth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingAuth) {
      return { status: "authorized", authorizedAt: existingAuth.authorizedAt };
    }

    // Check for pending/recent request
    const request = await ctx.db
      .query("accessRequests")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", userId)
      )
      .order("desc")
      .first();

    if (request) {
      return {
        status: request.status,
        requestId: request._id,
        requestedAt: request.requestedAt,
        respondedAt: request.respondedAt,
        responseMessage: request.responseMessage,
      };
    }

    return { status: "none" };
  },
});

// Get all requests for a mechanic (history)
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return [];

    const requests = await ctx.db
      .query("accessRequests")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", userId))
      .order("desc")
      .collect();

    // Enrich with vessel info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const vessel = await ctx.db.get(request.vesselId);
        return {
          ...request,
          vessel: vessel ? {
            _id: vessel._id,
            name: vessel.name,
            make: vessel.make,
            model: vessel.model,
            year: vessel.year,
          } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// ============================================
// OWNER'S MECHANICS MANAGEMENT
// ============================================

// Get all mechanics associated with owner's vessels
export const getMechanicsForOwner = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return [];

    // Get all owner's vessels
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    if (vessels.length === 0) return [];

    const vesselIds = vessels.map((v) => v._id);

    // Get all authorizations for these vessels
    const allAuthorizations: any[] = [];
    for (const vesselId of vesselIds) {
      const auths = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vesselId))
        .collect();
      allAuthorizations.push(...auths);
    }

    // Get all work orders for these vessels to include mechanics who have done work
    const allWorkOrders: any[] = [];
    for (const vesselId of vesselIds) {
      const orders = await ctx.db
        .query("workOrders")
        .withIndex("by_vessel", (q) => q.eq("vesselId", vesselId))
        .collect();
      allWorkOrders.push(...orders);
    }

    // Build a map of unique mechanics with their data
    const mechanicMap = new Map<string, {
      mechanicId: string;
      vessels: {
        vesselId: string;
        vesselName: string;
        isActive: boolean;
        authorizationId: string | null;
        authorizedAt: number | null;
      }[];
      workOrderCount: number;
      completedOrderCount: number;
      lastWorkDate: number | null;
    }>();

    // Process authorizations
    for (const auth of allAuthorizations) {
      const vessel = vessels.find((v) => v._id === auth.vesselId);
      if (!vessel) continue;

      const mechanicId = auth.mechanicId.toString();
      if (!mechanicMap.has(mechanicId)) {
        mechanicMap.set(mechanicId, {
          mechanicId: auth.mechanicId,
          vessels: [],
          workOrderCount: 0,
          completedOrderCount: 0,
          lastWorkDate: null,
        });
      }

      const mechData = mechanicMap.get(mechanicId)!;
      // Check if vessel already added
      const existingVessel = mechData.vessels.find((v) => v.vesselId === auth.vesselId.toString());
      if (!existingVessel) {
        mechData.vessels.push({
          vesselId: auth.vesselId.toString(),
          vesselName: vessel.name,
          isActive: auth.isActive,
          authorizationId: auth._id.toString(),
          authorizedAt: auth.authorizedAt,
        });
      } else {
        // Update with latest auth info
        existingVessel.isActive = auth.isActive;
        existingVessel.authorizationId = auth._id.toString();
        existingVessel.authorizedAt = auth.authorizedAt;
      }
    }

    // Process work orders
    for (const order of allWorkOrders) {
      const mechanicId = order.mechanicId.toString();
      const vessel = vessels.find((v) => v._id === order.vesselId);
      
      if (!mechanicMap.has(mechanicId)) {
        mechanicMap.set(mechanicId, {
          mechanicId: order.mechanicId,
          vessels: [],
          workOrderCount: 0,
          completedOrderCount: 0,
          lastWorkDate: null,
        });
      }

      const mechData = mechanicMap.get(mechanicId)!;
      mechData.workOrderCount++;
      
      if (order.status === "completed") {
        mechData.completedOrderCount++;
        if (order.completedAt && (!mechData.lastWorkDate || order.completedAt > mechData.lastWorkDate)) {
          mechData.lastWorkDate = order.completedAt;
        }
      }

      // Add vessel if not already in list (from work order but no authorization)
      if (vessel) {
        const existingVessel = mechData.vessels.find((v) => v.vesselId === order.vesselId.toString());
        if (!existingVessel) {
          mechData.vessels.push({
            vesselId: order.vesselId.toString(),
            vesselName: vessel.name,
            isActive: false,
            authorizationId: null,
            authorizedAt: null,
          });
        }
      }
    }

    // Fetch mechanic user data and build final result
    const mechanicsWithProfiles = await Promise.all(
      Array.from(mechanicMap.values()).map(async (mechData) => {
        const mechanic = await ctx.db.get(mechData.mechanicId as Id<"users">);
        if (!mechanic) return null;

        // Get profile photo URL
        let profilePhotoUrl: string | null = null;
        if (mechanic.profilePhotoStorageId) {
          profilePhotoUrl = await ctx.storage.getUrl(mechanic.profilePhotoStorageId);
        }

        return {
          _id: mechanic._id,
          name: mechanic.firstName && mechanic.lastName 
            ? `${mechanic.firstName} ${mechanic.lastName}` 
            : mechanic.name || "Unknown",
          email: mechanic.email,
          companyName: mechanic.companyName,
          phone: mechanic.phone,
          profilePhotoUrl,
          vessels: mechData.vessels,
          workOrderCount: mechData.workOrderCount,
          completedOrderCount: mechData.completedOrderCount,
          lastWorkDate: mechData.lastWorkDate,
          hasActiveAccess: mechData.vessels.some((v) => v.isActive),
        };
      })
    );

    // Filter out nulls and sort by most recent work or authorization
    return mechanicsWithProfiles
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by active access first, then by last work date
        if (a!.hasActiveAccess !== b!.hasActiveAccess) {
          return a!.hasActiveAccess ? -1 : 1;
        }
        return (b!.lastWorkDate || 0) - (a!.lastWorkDate || 0);
      });
  },
});

// Toggle mechanic access for a specific vessel
export const toggleMechanicAccess = mutation({
  args: {
    mechanicId: v.id("users"),
    vesselId: v.id("vessels"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can manage mechanic access");
    }

    // Verify the vessel belongs to this owner
    const vessel = await ctx.db.get(args.vesselId);
    if (!vessel || vessel.ownerId !== userId) {
      throw new Error("Vessel not found or you don't have permission");
    }

    // Find the authorization
    const auth = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", (q) =>
        q.eq("vesselId", args.vesselId).eq("mechanicId", args.mechanicId)
      )
      .first();

    const mechanic = await ctx.db.get(args.mechanicId);

    if (auth) {
      // Update existing authorization
      await ctx.db.patch(auth._id, { isActive: args.isActive });
    } else if (args.isActive) {
      // Create new authorization if granting access
      await ctx.db.insert("mechanicAuthorizations", {
        vesselId: args.vesselId,
        mechanicId: args.mechanicId,
        authorizedAt: Date.now(),
        authorizedBy: userId,
        isActive: true,
      });
    }

    // Notify the mechanic
    await ctx.db.insert("notifications", {
      userId: args.mechanicId,
      type: args.isActive ? "access_approved" : "access_revoked",
      title: args.isActive ? "Access Restored" : "Access Revoked",
      message: args.isActive 
        ? `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has restored your access to ${vessel.name}`
        : `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has revoked your access to ${vessel.name}`,
      relatedId: args.vesselId,
      relatedType: "vessel",
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Revoke all access for a mechanic across all owner's vessels
export const revokeAllMechanicAccess = mutation({
  args: {
    mechanicId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can manage mechanic access");
    }

    // Get all owner's vessels
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Revoke access for each vessel
    for (const vessel of vessels) {
      const auth = await ctx.db
        .query("mechanicAuthorizations")
        .withIndex("by_vessel_mechanic", (q) =>
          q.eq("vesselId", vessel._id).eq("mechanicId", args.mechanicId)
        )
        .first();

      if (auth && auth.isActive) {
        await ctx.db.patch(auth._id, { isActive: false });
      }
    }

    // Notify the mechanic
    const mechanic = await ctx.db.get(args.mechanicId);
    await ctx.db.insert("notifications", {
      userId: args.mechanicId,
      type: "access_revoked",
      title: "Access Revoked",
      message: `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "The owner"} has revoked your access to all their vessels`,
      relatedId: userId,
      relatedType: "user",
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
