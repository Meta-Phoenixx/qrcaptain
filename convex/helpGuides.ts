import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Help guide category validator
const guideCategoryValidator = v.union(
  v.literal("getting_started"),
  v.literal("vessels"),
  v.literal("work_orders"),
  v.literal("mechanics"),
  v.literal("equipment"),
  v.literal("billing"),
  v.literal("troubleshooting")
);

// Target role validator
const targetRoleValidator = v.union(
  v.literal("owner"),
  v.literal("mechanic"),
  v.literal("admin")
);

// Category display names
export const GUIDE_CATEGORIES = {
  getting_started: "Getting Started",
  vessels: "Vessels",
  work_orders: "Work Orders",
  mechanics: "Mechanics",
  equipment: "Equipment",
  billing: "Billing & Payments",
  troubleshooting: "Troubleshooting",
} as const;

// Get guides for current user's role
export const getGuidesByRole = query({
  args: {
    category: v.optional(guideCategoryValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const userRole = user.role || "owner";

    // Get all active guides
    let guides = await ctx.db
      .query("helpGuides")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by category if specified
    if (args.category) {
      guides = guides.filter((g) => g.category === args.category);
    }

    // Filter by role
    guides = guides.filter((g) => g.targetRoles.includes(userRole));

    // Sort by sortOrder
    guides.sort((a, b) => a.sortOrder - b.sortOrder);

    // Return without full content for list view
    return guides.map((g) => ({
      _id: g._id,
      title: g.title,
      summary: g.summary,
      category: g.category,
      sortOrder: g.sortOrder,
    }));
  },
});

// Get single guide with full content
export const getGuide = query({
  args: {
    guideId: v.id("helpGuides"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const guide = await ctx.db.get(args.guideId);
    if (!guide || !guide.isActive) return null;

    // Check if user's role has access
    const userRole = user.role || "owner";
    if (!guide.targetRoles.includes(userRole)) return null;

    return guide;
  },
});

// Get guides grouped by category for current user's role
export const getGuidesByCategory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const user = await ctx.db.get(userId);
    if (!user) return {};

    const userRole = user.role || "owner";

    // Get all active guides for user's role
    const guides = await ctx.db
      .query("helpGuides")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by role and group by category
    const filtered = guides.filter((g) => g.targetRoles.includes(userRole));
    
    const grouped: Record<string, typeof filtered> = {};
    for (const guide of filtered) {
      if (!grouped[guide.category]) {
        grouped[guide.category] = [];
      }
      grouped[guide.category].push(guide);
    }

    // Sort each category by sortOrder
    for (const category in grouped) {
      grouped[category].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return grouped;
  },
});

// Admin: List all guides
export const listAllGuides = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") return [];

    let guides;
    if (args.includeInactive) {
      guides = await ctx.db.query("helpGuides").collect();
    } else {
      guides = await ctx.db
        .query("helpGuides")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    // Sort by category then sortOrder
    guides.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.sortOrder - b.sortOrder;
    });

    return guides;
  },
});

// Admin: Create guide
export const createGuide = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    content: v.string(),
    category: guideCategoryValidator,
    targetRoles: v.array(targetRoleValidator),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create help guides");
    }

    // Auto-assign sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const existing = await ctx.db
        .query("helpGuides")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
      sortOrder = existing.length > 0 
        ? Math.max(...existing.map((g) => g.sortOrder)) + 1 
        : 0;
    }

    const now = Date.now();
    const guideId = await ctx.db.insert("helpGuides", {
      title: args.title,
      summary: args.summary,
      content: args.content,
      category: args.category,
      targetRoles: args.targetRoles,
      sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { guideId };
  },
});

// Admin: Update guide
export const updateGuide = mutation({
  args: {
    guideId: v.id("helpGuides"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(guideCategoryValidator),
    targetRoles: v.optional(v.array(targetRoleValidator)),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update help guides");
    }

    const { guideId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(guideId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Admin: Delete guide
export const deleteGuide = mutation({
  args: {
    guideId: v.id("helpGuides"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete help guides");
    }

    await ctx.db.delete(args.guideId);
    return { success: true };
  },
});

// Admin: Reorder guides within a category
export const reorderGuides = mutation({
  args: {
    guideIds: v.array(v.id("helpGuides")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can reorder help guides");
    }

    // Update sortOrder for each guide
    for (let i = 0; i < args.guideIds.length; i++) {
      await ctx.db.patch(args.guideIds[i], {
        sortOrder: i,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Seed initial help guides (admin only)
export const seedHelpGuides = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can seed help guides");
    }

    // Check if guides already exist
    const existing = await ctx.db.query("helpGuides").first();
    if (existing) {
      return { message: "Help guides already seeded" };
    }

    const now = Date.now();
    const defaultGuides = [
      {
        title: "Welcome to QR Captain",
        summary: "Learn the basics of using QR Captain to manage your vessels and work orders.",
        content: `# Welcome to QR Captain

QR Captain makes it easy to manage your vessel maintenance and connect with qualified marine mechanics.

## Key Features

- **Vessel Management**: Add and track all your vessels in one place
- **QR Codes**: Each vessel gets a unique QR code for easy mechanic access
- **Work Orders**: Request service and track repairs in real-time
- **Mechanic Directory**: Find and connect with trusted marine mechanics

## Getting Started

1. Complete your profile
2. Add your first vessel
3. Browse the mechanic directory
4. Request your first service

Need help? Check out our other guides or contact support.`,
        category: "getting_started" as const,
        targetRoles: ["owner" as const],
        sortOrder: 0,
      },
      {
        title: "Adding Your First Vessel",
        summary: "Step-by-step guide to adding a vessel to your QR Captain account.",
        content: `# Adding Your First Vessel

Follow these steps to add a vessel to your account.

## Required Information

- Vessel name
- Make and model
- Year
- Vessel type

## Optional Information

- Registration number
- Hull ID
- Vessel photo
- Equipment details

## Steps

1. Go to your Dashboard
2. Click "Add Vessel"
3. Fill in the vessel details
4. Add equipment (optional but recommended)
5. Save your vessel

Your vessel will now have a unique QR code that mechanics can scan for access.`,
        category: "vessels" as const,
        targetRoles: ["owner" as const],
        sortOrder: 0,
      },
      {
        title: "Requesting Service",
        summary: "How to request service from a mechanic using QR Captain.",
        content: `# Requesting Service

QR Captain makes it easy to request service from your preferred mechanics.

## Steps to Request Service

1. Select a vessel from your dashboard
2. Click "Request Service"
3. Choose a mechanic from your preferred list
4. Describe the work needed
5. Set the urgency level
6. Submit your request

## Urgency Levels

- **Routine**: Schedule when convenient
- **Soon**: Within the next week or two
- **Urgent**: As soon as possible

## What Happens Next

1. The mechanic receives your request
2. They'll review and submit a quote
3. You can accept or decline the quote
4. Once accepted, work begins!`,
        category: "work_orders" as const,
        targetRoles: ["owner" as const],
        sortOrder: 0,
      },
      {
        title: "Finding a Mechanic",
        summary: "How to use the mechanic directory to find qualified marine mechanics.",
        content: `# Finding a Mechanic

The Mechanic Directory helps you find qualified marine mechanics in your area.

## Using the Directory

1. Go to the Mechanics page
2. Use filters to narrow your search:
   - Availability status
   - Service area
   - Specializations
   - Minimum rating

## Mechanic Profiles

Click on a mechanic card to view their full profile:

- Rating and reviews
- Service areas
- Certifications
- Contact information
- Hours of operation

## Adding to Preferred List

Found a mechanic you like? Add them to your preferred list for easy access when requesting service.`,
        category: "mechanics" as const,
        targetRoles: ["owner" as const],
        sortOrder: 0,
      },
      {
        title: "Getting Started as a Mechanic",
        summary: "Complete your mechanic profile and start receiving work requests.",
        content: `# Getting Started as a Mechanic

Welcome to QR Captain! Here's how to set up your mechanic profile.

## Complete Your Profile

1. Add your company information
2. Set your service areas
3. List your specializations
4. Add certifications
5. Set your hours of operation

## Scanning QR Codes

Use the QR scanner to access vessel information:

1. Owner shares their vessel's QR code
2. Scan the code with QR Captain
3. Request access if needed
4. View vessel details and equipment

## Managing Work Orders

- View incoming work requests
- Submit quotes to owners
- Track active jobs
- Update work progress

## Tips for Success

- Keep your availability status updated
- Respond to requests promptly
- Document your work with photos`,
        category: "getting_started" as const,
        targetRoles: ["mechanic" as const],
        sortOrder: 0,
      },
    ];

    for (const guide of defaultGuides) {
      await ctx.db.insert("helpGuides", {
        ...guide,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { message: `Seeded ${defaultGuides.length} help guides` };
  },
});
