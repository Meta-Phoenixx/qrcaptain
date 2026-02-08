import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
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

// Book validator
const bookValidator = v.union(
  v.literal("owner"),
  v.literal("mechanic")
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

// Category order for sidebar
export const CATEGORY_ORDER = [
  "getting_started",
  "vessels",
  "equipment",
  "mechanics",
  "work_orders",
  "billing",
  "troubleshooting",
] as const;

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

// Get all guides for a specific book, grouped by category
export const getGuidesByBook = query({
  args: {
    book: bookValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Get all active guides for the specified book
    const guides = await ctx.db
      .query("helpGuides")
      .withIndex("by_book", (q) => q.eq("book", args.book).eq("isActive", true))
      .collect();

    // Sort by sortOrder
    guides.sort((a, b) => a.sortOrder - b.sortOrder);

    return guides.map((g) => ({
      _id: g._id,
      title: g.title,
      summary: g.summary,
      category: g.category,
      book: g.book,
      sortOrder: g.sortOrder,
      isPlaceholder: g.isPlaceholder || false,
    }));
  },
});

// Search guides by text (searches title, summary, and content)
export const searchGuides = query({
  args: {
    searchTerm: v.string(),
    book: v.optional(bookValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    if (!args.searchTerm.trim()) return [];

    const term = args.searchTerm.toLowerCase();

    // Get all active guides
    let guides = await ctx.db
      .query("helpGuides")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by book if specified
    if (args.book) {
      guides = guides.filter((g) => g.book === args.book);
    }

    // Search in title, summary, and content
    const results = guides.filter(
      (g) =>
        g.title.toLowerCase().includes(term) ||
        g.summary.toLowerCase().includes(term) ||
        g.content.toLowerCase().includes(term)
    );

    // Sort by relevance (title match first, then summary, then content)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(term) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(term) ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;
      
      const aSummary = a.summary.toLowerCase().includes(term) ? 0 : 1;
      const bSummary = b.summary.toLowerCase().includes(term) ? 0 : 1;
      return aSummary - bSummary;
    });

    return results.map((g) => ({
      _id: g._id,
      title: g.title,
      summary: g.summary,
      category: g.category,
      book: g.book,
      sortOrder: g.sortOrder,
      isPlaceholder: g.isPlaceholder || false,
    }));
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
    book: v.optional(bookValidator),
    sortOrder: v.optional(v.number()),
    isPlaceholder: v.optional(v.boolean()),
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
      book: args.book,
      sortOrder,
      isActive: true,
      isPlaceholder: args.isPlaceholder || false,
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
    book: v.optional(bookValidator),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isPlaceholder: v.optional(v.boolean()),
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

// Seed initial help guides (admin only) - Legacy, kept for backward compat
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
      return { message: "Help guides already seeded. Use seedComprehensiveGuides to replace." };
    }

    // Redirect to comprehensive seed
    return { message: "Use seedComprehensiveGuides instead for the full documentation set." };
  },
});

// ============================================
// COMPREHENSIVE HELP GUIDE CONTENT
// ============================================

// Helper to create a placeholder guide body
function placeholderContent(title: string): string {
  return `# ${title}\n\nThis guide is coming soon. We're working on detailed step-by-step instructions for this feature.\n\nIn the meantime, if you need help, please reach out to our support team or check the Getting Started guides for an overview of the platform.`;
}

// Shared type for guide data
type GuideInput = {
  title: string;
  summary: string;
  content: string;
  category: "getting_started" | "vessels" | "work_orders" | "mechanics" | "equipment" | "billing" | "troubleshooting";
  targetRoles: ("owner" | "mechanic" | "admin")[];
  book: "owner" | "mechanic";
  sortOrder: number;
  isPlaceholder: boolean;
};

// Shared function to get all guide data
function getComprehensiveGuides(): GuideInput[] {
  return [

      // ============================================
      // OWNER'S GUIDE - CHAPTER 1: GETTING STARTED
      // ============================================
      {
        title: "Welcome to QR Captain",
        summary: "An overview of QR Captain and what you can do as a boat owner.",
        content: `# Welcome to QR Captain

QR Captain is your all-in-one platform for managing vessel maintenance and connecting with qualified marine mechanics. Whether you have a single boat or an entire fleet, QR Captain helps you stay on top of every repair, service, and inspection.

## What You Can Do as an Owner

- **Manage Your Fleet**: Add all your vessels, track their details, and keep a comprehensive equipment manifest for each one.
- **QR Code Access**: Every vessel gets a unique QR code. Mechanics scan it to request access, view equipment details, and start work orders.
- **Find Trusted Mechanics**: Browse our directory of verified marine mechanics, read reviews, and build your preferred mechanics list.
- **Request Service**: Submit work order requests directly to your preferred mechanics with urgency levels and detailed descriptions.
- **Track Everything**: Follow work orders in real-time, review quotes, chat with mechanics, and view photos of work in progress.
- **Rate & Review**: After work is completed, rate your mechanic to help other owners find quality service.

## How It Works

1. **Set Up Your Profile** - Complete your owner profile with contact information.
2. **Add Your Vessels** - Register each vessel with its details and equipment.
3. **Connect with Mechanics** - Find mechanics in the directory or share your vessel's QR code.
4. **Request & Track Service** - Submit work requests, approve quotes, and monitor progress.
5. **Review & Repeat** - Rate your mechanic and keep your maintenance records organized.

## What's Next

Continue to the next guide to learn how to create your account and get started.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 0,
        isPlaceholder: false,
      },
      {
        title: "Creating Your Account",
        summary: "How to sign up for QR Captain and select your role as a boat owner.",
        content: `# Creating Your Account

Getting started with QR Captain takes just a few minutes. Here's how to create your owner account.

## Steps to Sign Up

1. **Go to QR Captain** - Open the app in your web browser.
2. **Click "Sign Up"** - On the sign-in page, you'll see a tab or link to create a new account.
3. **Enter Your Details**:
   - **First Name** - Your first name
   - **Last Name** - Your last name
   - **Email Address** - Use an email you check regularly; this is how you'll receive notifications.
   - **Password** - Choose a strong password (at least 8 characters recommended).
4. **Select Your Role** - Choose **"Boat Owner"** from the role selector. This determines what features you see in the app.
5. **Submit** - Click the sign-up button to create your account.

## After Signing Up

Once your account is created, you'll be automatically signed in and taken to the onboarding flow where you can:
- Complete your owner profile (name, phone, address, photo)
- Add your first vessel

> **Tip**: You can skip the onboarding and come back to it later, but completing it right away ensures you can use all features immediately.

## Signing In Later

To sign back in:
1. Go to QR Captain
2. Enter your email and password
3. Click "Sign In"

## What's Next

Continue to "Completing Your Owner Profile" to set up your personal information.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 1,
        isPlaceholder: false,
      },
      {
        title: "Completing Your Owner Profile",
        summary: "Step-by-step guide to filling out your owner profile with contact details and photo.",
        content: `# Completing Your Owner Profile

Your owner profile helps mechanics know who they're working with and how to reach you. Here's how to complete it.

## When You'll See This

After creating your account, the onboarding wizard will guide you through profile setup. You can also access your profile anytime from the **profile dropdown** in the top-right corner of the app.

## Step-by-Step: Profile Setup

### Step 1: Personal Information

Fill in the following required fields:

- **First Name** - Your first name (required)
- **Last Name** - Your last name (required)
- **Phone Number** - A phone number where mechanics can reach you (required)

### Step 2: Address

Enter your mailing address:

- **Street Address** (required)
- **City** (required)
- **State** (required)
- **ZIP Code** (required)

### Step 3: Profile Photo

Adding a profile photo helps mechanics recognize you:

1. Click the **camera icon** or **"Upload Photo"** button
2. Select an image from your device
3. **Crop your photo** - Use the cropping tool to adjust the frame. Drag to reposition, use the slider to zoom.
4. Click **"Save"** to confirm your cropped photo

> **Tip**: A clear headshot works best. This photo is visible to mechanics you work with.

## Editing Your Profile Later

1. Click your **profile avatar** in the top-right corner of any page
2. Select **"My Profile"** from the dropdown
3. Click **"Edit"** to modify your information
4. Make your changes and click **"Save"**

## Skipping Onboarding

If you're in a hurry, you can click **"Skip"** during onboarding. You'll see a reminder banner encouraging you to complete your profile. You can always come back to it later from your profile settings.

## What's Next

Continue to "Your First Vessel Setup" to learn how to add your first boat to QR Captain.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 2,
        isPlaceholder: false,
      },
      {
        title: "Your First Vessel Setup",
        summary: "How to add your first vessel including details, photos, and equipment using the onboarding wizard.",
        content: `# Your First Vessel Setup

After completing your profile, the onboarding wizard takes you to vessel setup. Here's how to register your first vessel in QR Captain.

## The Vessel Onboarding Wizard

The vessel setup has two steps: **Vessel Information** and **Equipment Setup**.

### Step 1: Vessel Information

Fill in your vessel's details:

**Required Fields:**
- **Vessel Name** - Give your boat a name (e.g., "Sea Breeze", "Lucky Star")
- **Make** - The manufacturer (e.g., "Boston Whaler", "Sea Ray")
- **Model** - The specific model (e.g., "Montauk 170", "Sundancer 320")
- **Year** - The model year

**Vessel Type** - Select from:
- Powerboat
- Sailboat
- Yacht
- Fishing Boat
- Pontoon
- Jet Ski
- Other

**Optional Fields:**
- **Registration Number** - Your vessel's registration/documentation number
- **Hull ID (HIN)** - The Hull Identification Number (found on the transom)
- **Vessel Photo** - Upload a photo of your vessel

> **Tip**: The more information you provide, the easier it is for mechanics to understand your vessel before starting work.

### Step 2: Equipment Setup

This step helps you catalog the major equipment on your vessel. You can add details for:

**Engine / Propulsion:**
- Engine type (Outboard, Inboard, Stern Drive, Jet)
- Make and model
- Horsepower

**Batteries:**
- Battery type (Lead Acid, AGM, Lithium)
- Number of batteries
- Brand

**Electronics** (select all that apply):
- GPS / Chartplotter
- VHF Radio
- Fishfinder / Depth Sounder
- Radar
- Autopilot
- Stereo System

> **Tip**: You can skip the equipment step and add equipment later from the Equipment Manifest on your dashboard. But adding it now saves time later.

## After Adding Your Vessel

Once saved, your vessel:
- Appears on your **dashboard** with its photo and details
- Gets a **unique QR code** that mechanics can scan
- Is ready for **work order requests**

## Adding More Vessels Later

From your dashboard:
1. Click the **"Add Vessel"** button
2. Fill in the vessel details
3. Optionally add equipment
4. Click **"Save"**

## What's Next

Continue to "Understanding the Dashboard" to learn how to navigate your main control center.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 3,
        isPlaceholder: false,
      },
      {
        title: "Understanding the Dashboard",
        summary: "Learn how to navigate the owner dashboard, view your fleet, and access quick actions.",
        content: `# Understanding the Dashboard

The dashboard is your central hub for managing vessels, work orders, mechanics, and more. Here's a tour of everything you'll find there.

## Accessing the Dashboard

- From the **Landing Page**, click **"View Dashboard"** in the Quick Actions section
- Or navigate directly by clicking on the dashboard option from the navigation

## Dashboard Layout

### Vessel Grid

The main area shows all your vessels in a card grid. Each vessel card displays:

- **Vessel Photo** (or a placeholder icon)
- **Vessel Name**
- **Make / Model / Year**
- **Registration Number** (if provided)
- **Active Work Order Badge** - Shows if there's work in progress

**Click a vessel card** to view its details, QR code, equipment manifest, and work order history.

### Stats Overview

At the top of the dashboard, you'll see quick stats:

- **Total Vessels** - How many vessels you've registered
- **Active Work Orders** - Work currently in progress
- **Pending Quotes** - Quotes waiting for your review
- **Completed Work Orders** - Total finished jobs

### Quick Actions

Buttons for common tasks:

- **Add Vessel** - Register a new vessel
- **Request Service** - Start a new work order request
- **Find Mechanic** - Open the mechanic directory

### Sections

The dashboard has tabbed sections:

- **My Vessels** - Your full fleet with vessel management
- **Work Orders** - All work orders organized by status (Pending Quotes, Pending Requests, Active, Completed)
- **My Mechanics** - Mechanics with access to your vessels, with per-vessel access controls

## Managing Vessels from the Dashboard

Click on any vessel to:
- View and edit vessel details
- See the vessel's **QR code** (share with mechanics)
- Open the **Equipment Manifest**
- View **Service History**
- Start a new **Work Order Request**

## What's Next

Continue to "Navigating the Landing Page" to learn about the home page and its features.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 4,
        isPlaceholder: false,
      },
      {
        title: "Navigating the Landing Page",
        summary: "Explore the landing page sections including stats, quick actions, announcements, and featured mechanics.",
        content: `# Navigating the Landing Page

The landing page is your personalized home screen when you sign in to QR Captain. It gives you a high-level overview and quick access to everything you need.

## Landing Page Sections

### Welcome Header

At the top, you'll see a personalized greeting with your name and role.

### Stats Cards

Quick-glance numbers showing:
- **Total Vessels** - Your fleet size
- **Active Work Orders** - Jobs in progress
- **Completed Work Orders** - Total finished jobs
- **Pending Quotes** - Quotes awaiting your review

### Quick Actions

Buttons for the most common tasks:
- **Request Service** - Jump to creating a work order request
- **Find a Mechanic** - Open the mechanic directory
- **My Vessels** - Go to your fleet on the dashboard
- **View Dashboard** - Switch to the full dashboard view

### Announcements

System-wide announcements from QR Captain. These may include:
- New feature announcements
- Maintenance notices
- Tips and seasonal reminders
- Important alerts

You can dismiss announcements after reading them.

### Upcoming Maintenance (Service Reminders)

If you've set up equipment with service intervals, this section shows:
- **Upcoming service** items nearing their next service date
- **Overdue service** items highlighted in red
- Equipment name and the vessel it belongs to

### Featured Mechanics

A carousel of top-rated mechanics in the system. Featured mechanics are selected based on:
- High ratings
- Quick response times
- Number of completed jobs
- Current availability

Click a mechanic card to view their full profile (Mechanic Spotlight).

### Recent Activity

A timeline of recent events:
- Work order status changes
- New messages
- Access request updates
- Rating activity

### Help & Guides

Quick access to help documentation (that's where you are now!). Shows the most relevant guides for your role.

## Navigation Header

At the top of every page, you'll find:
- **QR Captain Logo** - Click to return to the landing page
- **Help Button** - Opens the help center
- **Notification Bell** - Shows unread notification count; click to view all notifications
- **Profile Avatar** - Click for profile menu and sign out

## What's Next

You're all set with the basics! Explore the other chapters to learn about specific features like Vessel Management, Finding Mechanics, and Work Orders.`,
        category: "getting_started",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 5,
        isPlaceholder: false,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 2: VESSEL MANAGEMENT (Placeholders)
      // ============================================
      {
        title: "Adding a New Vessel",
        summary: "Step-by-step instructions for adding additional vessels to your fleet from the dashboard.",
        content: placeholderContent("Adding a New Vessel"),
        category: "vessels",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 10,
        isPlaceholder: true,
      },
      {
        title: "Editing Vessel Details",
        summary: "How to update your vessel's information, change its photo, and manage details.",
        content: placeholderContent("Editing Vessel Details"),
        category: "vessels",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 11,
        isPlaceholder: true,
      },
      {
        title: "Understanding QR Codes",
        summary: "Learn how QR codes work in QR Captain and how to share them with mechanics.",
        content: placeholderContent("Understanding QR Codes"),
        category: "vessels",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 12,
        isPlaceholder: true,
      },
      {
        title: "Managing Your Fleet",
        summary: "Navigate between vessels, view your fleet overview, and keep everything organized.",
        content: placeholderContent("Managing Your Fleet"),
        category: "vessels",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 13,
        isPlaceholder: true,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 3: EQUIPMENT & MAINTENANCE (Placeholders)
      // ============================================
      {
        title: "Equipment Manifest Overview",
        summary: "What the equipment manifest is and how it organizes your vessel's equipment across 15 categories.",
        content: placeholderContent("Equipment Manifest Overview"),
        category: "equipment",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 20,
        isPlaceholder: true,
      },
      {
        title: "Adding Equipment",
        summary: "How to add equipment items with details like manufacturer, serial number, warranty, and service intervals.",
        content: placeholderContent("Adding Equipment"),
        category: "equipment",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 21,
        isPlaceholder: true,
      },
      {
        title: "Service Intervals & Reminders",
        summary: "Set up date-based and hours-based service tracking to get notified before maintenance is due.",
        content: placeholderContent("Service Intervals & Reminders"),
        category: "equipment",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 22,
        isPlaceholder: true,
      },
      {
        title: "Equipment Warranty Tracking",
        summary: "Keep track of warranty information and expiration dates for all your equipment.",
        content: placeholderContent("Equipment Warranty Tracking"),
        category: "equipment",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 23,
        isPlaceholder: true,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 4: FINDING & MANAGING MECHANICS (Placeholders)
      // ============================================
      {
        title: "Using the Mechanic Directory",
        summary: "How to browse the mechanic directory to find qualified marine mechanics.",
        content: placeholderContent("Using the Mechanic Directory"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 30,
        isPlaceholder: true,
      },
      {
        title: "Searching & Filtering Mechanics",
        summary: "Use filters for availability, rating, specialization, and service area to find the right mechanic.",
        content: placeholderContent("Searching & Filtering Mechanics"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 31,
        isPlaceholder: true,
      },
      {
        title: "Viewing Mechanic Profiles",
        summary: "Read mechanic ratings, certifications, response times, and reviews in the Mechanic Spotlight.",
        content: placeholderContent("Viewing Mechanic Profiles"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 32,
        isPlaceholder: true,
      },
      {
        title: "Adding to Your Preferred List",
        summary: "Save your favorite mechanics for quick access when requesting service.",
        content: placeholderContent("Adding to Your Preferred List"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 33,
        isPlaceholder: true,
      },
      {
        title: "Managing Mechanic Vessel Access",
        summary: "Control which mechanics have access to each of your vessels.",
        content: placeholderContent("Managing Mechanic Vessel Access"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 34,
        isPlaceholder: true,
      },
      {
        title: "Responding to Access Requests",
        summary: "Review, approve, or deny when a mechanic requests access to one of your vessels.",
        content: placeholderContent("Responding to Access Requests"),
        category: "mechanics",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 35,
        isPlaceholder: true,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 5: WORK ORDERS (Placeholders)
      // ============================================
      {
        title: "Requesting Service",
        summary: "How to submit a work order request to a mechanic with vessel, description, and urgency.",
        content: placeholderContent("Requesting Service"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 40,
        isPlaceholder: true,
      },
      {
        title: "Understanding Urgency Levels",
        summary: "Learn when to use Routine, Soon, and Urgent urgency levels for work requests.",
        content: placeholderContent("Understanding Urgency Levels"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 41,
        isPlaceholder: true,
      },
      {
        title: "Reviewing Quotes",
        summary: "How to read and understand a mechanic's quote including labor, parts, and timeline.",
        content: placeholderContent("Reviewing Quotes"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 42,
        isPlaceholder: true,
      },
      {
        title: "Accepting or Declining Quotes",
        summary: "How to approve a quote to start work or decline with feedback.",
        content: placeholderContent("Accepting or Declining Quotes"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 43,
        isPlaceholder: true,
      },
      {
        title: "Tracking Work in Progress",
        summary: "Monitor active work orders with diagnosis, parts, photos, and cost summaries.",
        content: placeholderContent("Tracking Work in Progress"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 44,
        isPlaceholder: true,
      },
      {
        title: "Messaging Your Mechanic",
        summary: "Use the built-in chat to communicate with your mechanic about ongoing work.",
        content: placeholderContent("Messaging Your Mechanic"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 45,
        isPlaceholder: true,
      },
      {
        title: "Viewing Completed Work Orders",
        summary: "Review finished work including final costs, parts used, and work photos.",
        content: placeholderContent("Viewing Completed Work Orders"),
        category: "work_orders",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 46,
        isPlaceholder: true,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 6: RATINGS & REVIEWS (Placeholders - under billing for now)
      // ============================================
      {
        title: "Rating a Mechanic",
        summary: "Rate your mechanic on quality, communication, professionalism, and value after work is completed.",
        content: placeholderContent("Rating a Mechanic"),
        category: "billing",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 50,
        isPlaceholder: true,
      },
      {
        title: "Understanding Your Owner Rating",
        summary: "How mechanics rate you and what the rating criteria mean.",
        content: placeholderContent("Understanding Your Owner Rating"),
        category: "billing",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 51,
        isPlaceholder: true,
      },

      // ============================================
      // OWNER'S GUIDE - CHAPTER 7: TROUBLESHOOTING (Placeholders)
      // ============================================
      {
        title: "Common Issues & Solutions",
        summary: "Answers to frequently asked questions and common problems for boat owners.",
        content: placeholderContent("Common Issues & Solutions"),
        category: "troubleshooting",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 60,
        isPlaceholder: true,
      },
      {
        title: "QR Code Issues",
        summary: "Troubleshooting QR codes that won't scan or display correctly.",
        content: placeholderContent("QR Code Issues"),
        category: "troubleshooting",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 61,
        isPlaceholder: true,
      },
      {
        title: "Notification Problems",
        summary: "What to do if you're not receiving notifications or alerts.",
        content: placeholderContent("Notification Problems"),
        category: "troubleshooting",
        targetRoles: ["owner"],
        book: "owner",
        sortOrder: 62,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 1: GETTING STARTED
      // ============================================
      {
        title: "Welcome to QR Captain for Mechanics",
        summary: "An overview of QR Captain and how it connects you with boat owners for marine service work.",
        content: `# Welcome to QR Captain for Mechanics

QR Captain connects marine mechanics with boat owners who need professional service. The platform streamlines everything from finding new clients to managing work orders, tracking parts, and getting paid.

## What You Can Do as a Mechanic

- **Build Your Profile**: Create a professional profile showcasing your certifications, specializations, service areas, and hours of operation.
- **Get Discovered**: Appear in the Mechanic Directory where boat owners search for qualified mechanics.
- **Receive Work Requests**: Owners send you service requests with descriptions and urgency levels. You respond with professional quotes.
- **Scan QR Codes**: Scan a vessel's QR code to request access, view equipment details, and start work orders.
- **Manage Work Orders**: Track all your jobs, add parts and photos, communicate with owners, and mark work complete.
- **Build Your Reputation**: Earn ratings and reviews from satisfied owners to grow your business.

## How It Works

1. **Complete Your Profile** - Set up your business information, services, and credentials.
2. **Set Your Availability** - Let owners know when you're open for new work.
3. **Get Connected** - Owners find you in the directory or you scan their vessel's QR code.
4. **Quote & Work** - Receive requests, submit quotes, do the work, and document everything.
5. **Get Rated** - Build your reputation with quality service and professionalism.

## What's Next

Continue to the next guide to learn how to create your mechanic account.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 100,
        isPlaceholder: false,
      },
      {
        title: "Creating Your Mechanic Account",
        summary: "How to sign up for QR Captain and select the mechanic role.",
        content: `# Creating Your Mechanic Account

Setting up your QR Captain mechanic account is quick and easy. Here's how to get started.

## Steps to Sign Up

1. **Go to QR Captain** - Open the app in your web browser.
2. **Click "Sign Up"** - On the sign-in page, find the sign-up tab or link.
3. **Enter Your Details**:
   - **First Name** - Your first name
   - **Last Name** - Your last name  
   - **Email Address** - Use your business email if you have one; this is where notifications go.
   - **Password** - Choose a strong password (at least 8 characters recommended).
4. **Select Your Role** - Choose **"Marine Mechanic"** from the role selector. This gives you access to mechanic-specific features like QR scanning, quoting, and work order management.
5. **Submit** - Click the sign-up button to create your account.

## After Signing Up

You'll be signed in and taken to the onboarding wizard. This is a 4-step process to set up your business profile:
- Step 1: Business Information
- Step 2: Services & Coverage
- Step 3: Hours of Operation
- Step 4: Optional Extras (Certifications, etc.)

> **Important**: You need to complete at least the required fields in onboarding before you can access features like the QR scanner and work order management. You can skip and come back, but some features will be limited.

## Signing In Later

To sign back in:
1. Go to QR Captain
2. Enter your email and password
3. Click "Sign In"

## What's Next

Continue to "Setting Up Your Business Profile" for a detailed walkthrough of the 4-step onboarding wizard.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 101,
        isPlaceholder: false,
      },
      {
        title: "Setting Up Your Business Profile",
        summary: "Detailed walkthrough of the 4-step onboarding wizard: business info, services, hours, and credentials.",
        content: `# Setting Up Your Business Profile

The onboarding wizard walks you through four steps to create your professional mechanic profile. A complete profile helps you appear in the Mechanic Directory and win more work.

## Step 1: Business Information

This step covers the basics of your business.

**Required Fields:**
- **Years in Operation** - How long your business has been running (number)
- **Business License Number** - Your business license or contractor number

**Business Address:**
- **Street Address** (required)
- **City** (required)
- **State** (required)
- **ZIP Code** (required)

> **Tip**: Your business address helps owners find mechanics in their area. Make sure it's accurate.

## Step 2: Services & Coverage

Tell owners what you do and where you do it.

**Service Areas:**
- Start typing a location and select from the suggestions
- Add multiple service areas (e.g., "Miami", "Fort Lauderdale", "Key West")
- Owners can filter the directory by service area, so add all areas you cover

**Service Types:**
- Select all the types of service you offer from the multi-select list
- Examples: Engine Repair, Electrical, Fiberglass, Bottom Paint, Electronics Installation, etc.

## Step 3: Hours of Operation

Set your weekly schedule so owners know when you're available.

For each day of the week (Monday through Sunday):
- **Open Time** - When you start accepting work
- **Close Time** - When you stop for the day
- **Closed** checkbox - Check if you don't work that day

> **Tip**: Even if your hours vary, set your typical schedule. You can always update it later.

## Step 4: Optional Extras

These fields aren't required but significantly improve your profile and directory listing.

**Certifications:**
- Add any certifications you hold (e.g., "Yamaha Certified", "Mercury Master Tech", "EPA 608", "ABYC Certified")
- Certifications appear on your directory card and build trust with owners

**Specializations:**
- List your areas of expertise (e.g., "Outboard Engines", "Marine Electronics", "Diesel Systems")

**Insurance & Bonding:**
- **Insured** - Toggle on if you carry business insurance
- **Bonded** - Toggle on if you're bonded
- These show as trust badges on your profile

**Mobile Service:**
- Toggle on if you can travel to the vessel (most marine mechanics do)
- Shows a "Mobile Service" badge on your profile

**Languages Spoken:**
- Add any languages you speak

**Bio:**
- Write a short description of your business (2-3 sentences)
- This appears on your Mechanic Spotlight profile

**Website & Google My Business:**
- **Website URL** - Link to your business website
- **Google My Business URL** - Link to your GMB listing

## Completing Onboarding

After filling in the required fields across all four steps, click **"Complete Setup"**. Your profile will be:
- Visible in the **Mechanic Directory**
- Available for owners to add to their **preferred mechanics list**
- Ready to receive **work order requests**

## Profile Completion Percentage

Your profile shows a completion percentage. The more fields you fill in, the higher it goes. A complete profile:
- Ranks higher in search results
- Shows more trust indicators
- Helps you win more business

## What's Next

Continue to "Completing Your Profile Photo & Logo" to add visual branding to your profile.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 102,
        isPlaceholder: false,
      },
      {
        title: "Completing Your Profile Photo & Logo",
        summary: "How to upload and crop your profile photo and company logo for your mechanic profile.",
        content: `# Completing Your Profile Photo & Logo

A professional photo and company logo help you stand out in the Mechanic Directory. Here's how to add them.

## Adding Your Profile Photo

Your profile photo appears next to your name throughout the app.

1. Go to your **Profile** (click your avatar in the top-right, then "My Profile")
2. Click the **camera icon** on your profile photo area
3. **Select an image** from your device
4. **Crop your photo**:
   - Drag the image to reposition it within the crop frame
   - Use the zoom slider to adjust the size
   - The preview shows how it will look as a circle
5. Click **"Save"** to upload your cropped photo

> **Tip**: Use a professional-looking headshot or a photo of you at work. This helps owners feel confident about who they're hiring.

## Adding Your Company Logo

Your company logo appears on your Mechanic Directory card and Spotlight profile.

1. Go to your **Profile**
2. Find the **Company Logo** section
3. Click **"Upload Logo"**
4. **Select your logo image** from your device
5. **Crop if needed** using the same crop tool
6. Click **"Save"**

> **Tip**: If you don't have a company logo, your profile photo will be used instead. A logo adds a professional touch.

## Image Requirements

- Supported formats: JPEG, PNG, WebP
- Images are automatically optimized for the web
- The crop tool lets you adjust any image to fit properly

## Updating Your Photos Later

You can change your profile photo or logo anytime:
1. Go to **My Profile**
2. Click the camera icon on the photo you want to change
3. Upload a new image and crop it
4. Save

## What's Next

Continue to "Understanding Your Dashboard" to learn how to navigate your main work hub.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 103,
        isPlaceholder: false,
      },
      {
        title: "Understanding Your Mechanic Dashboard",
        summary: "Navigate the mechanic dashboard: stats, authorized vessels, work orders, and QR scanner.",
        content: `# Understanding Your Mechanic Dashboard

The dashboard is your command center for managing jobs, vessels, and work orders. Here's what you'll find.

## Accessing the Dashboard

- From the **Landing Page**, click **"View Dashboard"** in Quick Actions
- The dashboard shows everything you need for day-to-day operations

## Dashboard Layout

### Stats Bar

At the top, you'll see your key numbers:
- **Active Jobs** - Work orders currently in progress
- **Pending Requests** - Owner requests waiting for your quote
- **Completed This Month** - Jobs finished in the current month

### Authorized Vessels

A grid of vessels you've been granted access to. Each vessel card shows:
- **Vessel Photo** and name
- **Owner Information** (name, contact)
- **Active Work Order Badge** (if applicable)
- **Quick Actions**: Start Work Order, View Equipment, View History

### Work Orders Section

Organized into tabs by status:

**Pending Requests:**
- Work order requests from owners waiting for your quote
- Shows urgency badges (Routine, Soon, Urgent)
- Click to review details and submit a quote

**Active Work Orders:**
- Jobs currently in progress
- Click to open the work order editor

**Completed:**
- Recently finished work orders
- Review and rate owners

### QR Scanner

A quick-access button to open the QR code scanner. Use this to:
- Scan a vessel's QR code
- Request access to a new vessel
- View vessel details for vessels you already have access to

### Profile Incomplete Banner

If you haven't completed onboarding, you'll see a banner at the top reminding you to finish your profile. Some features are limited until onboarding is complete.

## What's Next

Continue to "Understanding the Landing Page" to learn about your personalized home screen.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 104,
        isPlaceholder: false,
      },
      {
        title: "Understanding the Mechanic Landing Page",
        summary: "Explore the mechanic landing page: stats, quick actions, activity feed, and announcements.",
        content: `# Understanding the Mechanic Landing Page

The landing page is your personalized home screen with a quick overview of your business activity.

## Landing Page Sections

### Welcome Header

A personalized greeting showing your company name (or your name if no company is set).

### Stats Cards

At a glance, see:
- **Active Jobs** - Currently in-progress work orders
- **Completed Jobs** - Total jobs you've finished
- **Pending Requests** - Owner requests awaiting your response
- **Average Rating** - Your overall mechanic rating

### Quick Actions

Buttons for your most common tasks:
- **View Work Orders** - Jump to your work orders on the dashboard
- **Scan QR Code** - Open the QR scanner to access a vessel
- **Update Availability** - Change your availability status
- **View Dashboard** - Switch to the full dashboard view

### Announcements

System-wide announcements from QR Captain:
- New features and updates
- Maintenance notices
- Tips for growing your business
- Important alerts

### Recent Activity

A timeline of recent events in your account:
- New work order requests
- Quote acceptances/declines
- Work order status changes
- New ratings received
- Access approvals

### Help & Guides

Quick access to help documentation relevant to mechanics (you're reading these now!).

## Navigation Header

The top bar on every page includes:
- **QR Captain Logo** - Click to return to the landing page
- **Help Button** - Opens the help center
- **Notification Bell** - View and manage your notifications
- **Profile Avatar** - Access your profile and sign out

## What's Next

You're all set with the basics! Explore the other chapters to learn about Availability Management, Vessel Access, Work Orders, and more.`,
        category: "getting_started",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 105,
        isPlaceholder: false,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 2: AVAILABILITY & PROFILE (Placeholders)
      // ============================================
      {
        title: "Managing Your Availability Status",
        summary: "Set your availability to Available, Limited, At Capacity, or Unavailable to control incoming work.",
        content: placeholderContent("Managing Your Availability Status"),
        category: "mechanics",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 110,
        isPlaceholder: true,
      },
      {
        title: "Setting Max Concurrent Jobs",
        summary: "Configure how many jobs you can handle at once and how it affects auto-availability suggestions.",
        content: placeholderContent("Setting Max Concurrent Jobs"),
        category: "mechanics",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 111,
        isPlaceholder: true,
      },
      {
        title: "Updating Your Profile",
        summary: "Edit your business details, services, hours, and credentials section by section.",
        content: placeholderContent("Updating Your Profile"),
        category: "mechanics",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 112,
        isPlaceholder: true,
      },
      {
        title: "Your Public Profile (Mechanic Spotlight)",
        summary: "What boat owners see when they view your profile: ratings, credentials, reviews, and more.",
        content: placeholderContent("Your Public Profile (Mechanic Spotlight)"),
        category: "mechanics",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 113,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 3: VESSEL ACCESS (Placeholders)
      // ============================================
      {
        title: "Scanning QR Codes",
        summary: "How to use the QR scanner to access vessel information, with camera and manual entry options.",
        content: placeholderContent("Scanning QR Codes"),
        category: "vessels",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 120,
        isPlaceholder: true,
      },
      {
        title: "Requesting Vessel Access",
        summary: "How to request access to a vessel after scanning its QR code, and the approval process.",
        content: placeholderContent("Requesting Vessel Access"),
        category: "vessels",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 121,
        isPlaceholder: true,
      },
      {
        title: "Your Authorized Vessels",
        summary: "View your list of authorized vessels, owner details, and quick actions for each.",
        content: placeholderContent("Your Authorized Vessels"),
        category: "vessels",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 122,
        isPlaceholder: true,
      },
      {
        title: "Viewing Equipment Manifests",
        summary: "Browse a vessel's equipment catalog organized by category with full item details.",
        content: placeholderContent("Viewing Equipment Manifests"),
        category: "vessels",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 123,
        isPlaceholder: true,
      },
      {
        title: "Viewing Service History",
        summary: "Access past work orders and maintenance records for any authorized vessel.",
        content: placeholderContent("Viewing Service History"),
        category: "vessels",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 124,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 4: WORK ORDERS (Placeholders)
      // ============================================
      {
        title: "Responding to Work Order Requests",
        summary: "How to view and respond to incoming work requests from boat owners.",
        content: placeholderContent("Responding to Work Order Requests"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 130,
        isPlaceholder: true,
      },
      {
        title: "Submitting a Quote",
        summary: "Step-by-step guide to creating a professional quote with labor, parts, timeline, and notes.",
        content: placeholderContent("Submitting a Quote"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 131,
        isPlaceholder: true,
      },
      {
        title: "Declining a Request",
        summary: "How to professionally decline a work request with an optional reason.",
        content: placeholderContent("Declining a Request"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 132,
        isPlaceholder: true,
      },
      {
        title: "Creating a Direct Work Order",
        summary: "Start a work order directly on an authorized vessel without a quote request from the owner.",
        content: placeholderContent("Creating a Direct Work Order"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 133,
        isPlaceholder: true,
      },
      {
        title: "Updating Work Orders",
        summary: "How to update diagnosis, work performed, labor, and estimated completion in the work order editor.",
        content: placeholderContent("Updating Work Orders"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 134,
        isPlaceholder: true,
      },
      {
        title: "Adding Parts to Work Orders",
        summary: "Track parts with names, part numbers, costs, warranty info, and photos using the parts catalog.",
        content: placeholderContent("Adding Parts to Work Orders"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 135,
        isPlaceholder: true,
      },
      {
        title: "Adding Work Photos",
        summary: "Document your work with before, during, and after photos with captions.",
        content: placeholderContent("Adding Work Photos"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 136,
        isPlaceholder: true,
      },
      {
        title: "Completing a Work Order",
        summary: "How to mark work as complete with required descriptions and final cost summary.",
        content: placeholderContent("Completing a Work Order"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 137,
        isPlaceholder: true,
      },
      {
        title: "Cancelling a Work Order",
        summary: "When and how to cancel a work order that can't be completed.",
        content: placeholderContent("Cancelling a Work Order"),
        category: "work_orders",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 138,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 5: COMMUNICATION (Placeholders)
      // ============================================
      {
        title: "Work Order Messaging",
        summary: "Chat with boat owners in real-time within the work order editor.",
        content: placeholderContent("Work Order Messaging"),
        category: "billing",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 140,
        isPlaceholder: true,
      },
      {
        title: "Access Request Messages",
        summary: "Communicate with owners during the vessel access request process.",
        content: placeholderContent("Access Request Messages"),
        category: "billing",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 141,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 6: RATINGS & REVIEWS (Placeholders)
      // ============================================
      {
        title: "Rating an Owner",
        summary: "Rate boat owners on communication, preparedness, payment, and respect after completing work.",
        content: placeholderContent("Rating an Owner"),
        category: "billing",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 150,
        isPlaceholder: true,
      },
      {
        title: "Understanding Your Mechanic Rating",
        summary: "How the wrench rating system works and how ratings affect your directory listing.",
        content: placeholderContent("Understanding Your Mechanic Rating"),
        category: "billing",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 151,
        isPlaceholder: true,
      },

      // ============================================
      // MECHANIC'S GUIDE - CHAPTER 7: TROUBLESHOOTING (Placeholders)
      // ============================================
      {
        title: "Common Issues for Mechanics",
        summary: "Answers to frequently asked questions and common problems for mechanics.",
        content: placeholderContent("Common Issues for Mechanics"),
        category: "troubleshooting",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 160,
        isPlaceholder: true,
      },
      {
        title: "QR Scanner Problems",
        summary: "Troubleshoot camera permissions, scanning issues, and the manual entry fallback.",
        content: placeholderContent("QR Scanner Problems"),
        category: "troubleshooting",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 161,
        isPlaceholder: true,
      },
      {
        title: "Profile Not Showing in Directory",
        summary: "What to do if your profile doesn't appear in the Mechanic Directory.",
        content: placeholderContent("Profile Not Showing in Directory"),
        category: "troubleshooting",
        targetRoles: ["mechanic"],
        book: "mechanic",
        sortOrder: 162,
        isPlaceholder: true,
      },
    ];
}

// Seed comprehensive help guides (admin only)
export const seedComprehensiveGuides = mutation({
  args: {
    replace: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can seed help guides");
    }

    if (args.replace) {
      const existing = await ctx.db.query("helpGuides").collect();
      for (const guide of existing) {
        await ctx.db.delete(guide._id);
      }
    } else {
      const existing = await ctx.db.query("helpGuides").first();
      if (existing) {
        return { message: "Help guides already exist. Pass replace: true to overwrite." };
      }
    }

    const now = Date.now();
    const allGuides = getComprehensiveGuides();

    let count = 0;
    for (const guide of allGuides) {
      await ctx.db.insert("helpGuides", {
        ...guide,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: `Seeded ${count} help guides (${allGuides.filter(g => !g.isPlaceholder).length} complete, ${allGuides.filter(g => g.isPlaceholder).length} placeholders)` };
  },
});

// Internal version for CLI seeding: npx convex run helpGuides:internalSeedGuides
export const internalSeedGuides = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete existing guides first
    const existing = await ctx.db.query("helpGuides").collect();
    for (const guide of existing) {
      await ctx.db.delete(guide._id);
    }

    const now = Date.now();
    const allGuides = getComprehensiveGuides();

    let count = 0;
    for (const guide of allGuides) {
      await ctx.db.insert("helpGuides", {
        ...guide,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: `Seeded ${count} help guides (${allGuides.filter(g => !g.isPlaceholder).length} complete, ${allGuides.filter(g => g.isPlaceholder).length} placeholders)` };
  },
});
