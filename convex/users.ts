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

// ============ MECHANIC ONBOARDING ============

// Check if mechanic has completed onboarding
export const getMechanicOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") return null;

    // Check what required fields are missing
    const requiredFields = {
      companyName: !!user.companyName,
      phone: !!user.phone,
      businessYearsInOperation: user.businessYearsInOperation !== undefined,
      businessLicenseNumber: !!user.businessLicenseNumber,
      businessAddress: !!user.businessAddress,
      serviceAreas: !!(user.serviceAreas && user.serviceAreas.length > 0),
      serviceTypes: !!(user.serviceTypes && user.serviceTypes.length > 0),
      hoursOfOperation: !!user.hoursOfOperation,
    };

    const completedCount = Object.values(requiredFields).filter(Boolean).length;
    const totalRequired = Object.keys(requiredFields).length;

    return {
      isCompleted: user.onboardingCompleted === true,
      wasSkipped: user.onboardingSkippedAt !== undefined,
      completedAt: user.onboardingCompletedAt,
      skippedAt: user.onboardingSkippedAt,
      requiredFields,
      completedCount,
      totalRequired,
      progressPercent: Math.round((completedCount / totalRequired) * 100),
    };
  },
});

// Complete mechanic onboarding with all required data
export const completeMechanicOnboarding = mutation({
  args: {
    // Required fields
    businessYearsInOperation: v.number(),
    businessLicenseNumber: v.string(),
    businessAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    }),
    serviceAreas: v.array(v.string()),
    serviceTypes: v.array(v.string()),
    hoursOfOperation: v.object({
      monday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
    }),
    // Optional fields
    certifications: v.optional(v.array(v.string())),
    googleMyBusinessUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    isInsured: v.optional(v.boolean()),
    isBonded: v.optional(v.boolean()),
    specializations: v.optional(v.array(v.string())),
    hasMobileCapabilities: v.optional(v.boolean()),
    languagesSpoken: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can complete onboarding");
    }

    // Update user with onboarding data
    await ctx.db.patch(userId, {
      businessYearsInOperation: args.businessYearsInOperation,
      businessLicenseNumber: args.businessLicenseNumber,
      businessAddress: args.businessAddress,
      serviceAreas: args.serviceAreas,
      serviceTypes: args.serviceTypes,
      hoursOfOperation: args.hoursOfOperation,
      certifications: args.certifications,
      googleMyBusinessUrl: args.googleMyBusinessUrl,
      websiteUrl: args.websiteUrl,
      isInsured: args.isInsured,
      isBonded: args.isBonded,
      specializations: args.specializations,
      hasMobileCapabilities: args.hasMobileCapabilities,
      languagesSpoken: args.languagesSpoken,
      bio: args.bio,
      onboardingCompleted: true,
      onboardingCompletedAt: Date.now(),
    });

    return { success: true };
  },
});

// Skip onboarding (still allows profile access but restricts features)
export const skipMechanicOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can skip onboarding");
    }

    await ctx.db.patch(userId, {
      onboardingSkippedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update mechanic profile (for editing after onboarding)
export const updateMechanicProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    businessYearsInOperation: v.optional(v.number()),
    businessLicenseNumber: v.optional(v.string()),
    businessAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
    serviceAreas: v.optional(v.array(v.string())),
    serviceTypes: v.optional(v.array(v.string())),
    hoursOfOperation: v.optional(v.object({
      monday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
    })),
    certifications: v.optional(v.array(v.string())),
    googleMyBusinessUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    isInsured: v.optional(v.boolean()),
    isBonded: v.optional(v.boolean()),
    specializations: v.optional(v.array(v.string())),
    hasMobileCapabilities: v.optional(v.boolean()),
    languagesSpoken: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "mechanic") {
      throw new Error("Only mechanics can update mechanic profile");
    }

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(userId, updates);

    // Check if all required fields are now filled (auto-complete onboarding)
    const updatedUser = await ctx.db.get(userId);
    if (updatedUser && !updatedUser.onboardingCompleted) {
      const hasAllRequired = 
        updatedUser.companyName &&
        updatedUser.phone &&
        updatedUser.businessYearsInOperation !== undefined &&
        updatedUser.businessLicenseNumber &&
        updatedUser.businessAddress &&
        updatedUser.serviceAreas && updatedUser.serviceAreas.length > 0 &&
        updatedUser.serviceTypes && updatedUser.serviceTypes.length > 0 &&
        updatedUser.hoursOfOperation;
      
      if (hasAllRequired) {
        await ctx.db.patch(userId, {
          onboardingCompleted: true,
          onboardingCompletedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// ============ OWNER ONBOARDING ============

// Check if owner has completed onboarding
export const getOwnerOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") return null;

    // Check what required fields are filled
    const requiredFields = {
      fullName: !!user.fullName,
      phone: !!user.phone,
      address: !!user.address,
    };

    // Check if they have at least one vessel
    const vessels = await ctx.db
      .query("vessels")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    
    const hasVessel = vessels.length > 0;

    const profileComplete = Object.values(requiredFields).every(Boolean);
    const completedCount = Object.values(requiredFields).filter(Boolean).length;
    const totalRequired = Object.keys(requiredFields).length;

    return {
      isCompleted: user.onboardingCompleted === true,
      wasSkipped: user.onboardingSkippedAt !== undefined,
      completedAt: user.onboardingCompletedAt,
      skippedAt: user.onboardingSkippedAt,
      requiredFields,
      profileComplete,
      hasVessel,
      vesselCount: vessels.length,
      completedCount,
      totalRequired,
      progressPercent: Math.round((completedCount / totalRequired) * 100),
    };
  },
});

// Complete owner profile onboarding
export const completeOwnerOnboarding = mutation({
  args: {
    fullName: v.string(),
    phone: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can complete owner onboarding");
    }

    // Update user with onboarding data
    await ctx.db.patch(userId, {
      fullName: args.fullName,
      phone: args.phone,
      address: args.address,
      onboardingCompleted: true,
      onboardingCompletedAt: Date.now(),
    });

    return { success: true };
  },
});

// Skip owner onboarding
export const skipOwnerOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can skip onboarding");
    }

    await ctx.db.patch(userId, {
      onboardingSkippedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update owner profile
export const updateOwnerProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "owner") {
      throw new Error("Only owners can update owner profile");
    }

    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(userId, updates);

    // Check if all required fields are now filled (auto-complete onboarding)
    const updatedUser = await ctx.db.get(userId);
    if (updatedUser && !updatedUser.onboardingCompleted) {
      const hasAllRequired = 
        updatedUser.fullName &&
        updatedUser.phone &&
        updatedUser.address;
      
      if (hasAllRequired) {
        await ctx.db.patch(userId, {
          onboardingCompleted: true,
          onboardingCompletedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});
