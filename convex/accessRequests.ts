import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      message: `${user.fullName || user.name || "A mechanic"} is requesting access to ${vessel.name}`,
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
        message: `${owner?.fullName || "The owner"} has approved your access to ${vessel?.name || "the vessel"}${args.message ? `: "${args.message}"` : ""}`,
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
        message: `${owner?.fullName || "The owner"} has denied your access to ${vessel?.name || "the vessel"}${args.message ? `: "${args.message}"` : ""}`,
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
            name: mechanic.fullName || mechanic.name,
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
