import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get the current authenticated user
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user;
  },
});

// Seed an admin user - call this via CLI: npx convex run users:seedAdmin
export const seedAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if admin already exists
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "admin@qrcaptain.com"))
      .first();
    
    if (existingAdmin) {
      // Update to admin role if not already
      if (existingAdmin.role !== "admin") {
        await ctx.db.patch(existingAdmin._id, { role: "admin" });
      }
      return { message: "Admin user already exists", userId: existingAdmin._id };
    }

    // Create new admin user
    const userId = await ctx.db.insert("users", {
      email: "admin@qrcaptain.com",
      name: "Admin",
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
    });

    return { 
      message: "Admin user created. Sign up with email: admin@qrcaptain.com to set password", 
      userId 
    };
  },
});

// Update a user's role to admin (for promoting existing users)
export const promoteToAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    
    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    await ctx.db.patch(user._id, { role: "admin" });
    return { message: `User ${args.email} promoted to admin`, userId: user._id };
  },
});

// Create a new user profile (called during sign up)
export const createProfile = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("owner"),
      v.literal("mechanic")
    ),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db.get(args.userId);
    if (existing) return existing._id;

    // Create the user profile
    await ctx.db.patch(args.userId, {
      email: args.email,
      fullName: args.fullName,
      role: args.role,
      isActive: true,
    });

    return args.userId;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    companyName: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const updates: Record<string, string | undefined> = {};
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.companyName !== undefined) updates.companyName = args.companyName;
    if (args.licenseNumber !== undefined)
      updates.licenseNumber = args.licenseNumber;

    await ctx.db.patch(userId, updates);
    return { success: true };
  },
});

// Get all users (admin only)
export const listUsers = query({
  args: {
    role: v.optional(
      v.union(v.literal("admin"), v.literal("owner"), v.literal("mechanic"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Admin access required");
    }

    if (args.role) {
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .collect();
    }

    return await ctx.db.query("users").collect();
  },
});

// Get a mechanic's profile with their rating
export const getMechanicProfile = query({
  args: { mechanicId: v.id("users") },
  handler: async (ctx, args) => {
    const mechanic = await ctx.db.get(args.mechanicId);
    if (!mechanic || mechanic.role !== "mechanic") {
      return null;
    }

    // Get all ratings for this mechanic
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_mechanic", (q) => q.eq("mechanicId", args.mechanicId))
      .collect();

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      ...mechanic,
      avgRating,
      totalRatings: ratings.length,
    };
  },
});
