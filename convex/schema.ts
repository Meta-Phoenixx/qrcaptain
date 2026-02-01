import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extended user profile
  users: defineTable({
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("owner"),
      v.literal("mechanic")
    ),
    companyName: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Vessels owned by users
  vessels: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    registrationNumber: v.optional(v.string()),
    hullId: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vesselType: v.string(),
    notes: v.optional(v.string()),
    qrCodeData: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_qr_code", ["qrCodeData"]),

  // Equipment catalog for each vessel
  vesselEquipment: defineTable({
    vesselId: v.id("vessels"),
    category: v.union(
      v.literal("engine"),
      v.literal("electronics"),
      v.literal("plumbing"),
      v.literal("electrical"),
      v.literal("hvac"),
      v.literal("safety"),
      v.literal("navigation"),
      v.literal("other")
    ),
    name: v.string(),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    notes: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  }).index("by_vessel", ["vesselId"]),

  // Work orders created by mechanics
  workOrders: defineTable({
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    description: v.string(),
    diagnosis: v.optional(v.string()),
    workPerformed: v.optional(v.string()),
    laborHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_vessel", ["vesselId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_status", ["status"]),

  // Parts used in work orders
  workOrderParts: defineTable({
    workOrderId: v.id("workOrders"),
    name: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
  }).index("by_work_order", ["workOrderId"]),

  // Photos attached to work orders
  workOrderPhotos: defineTable({
    workOrderId: v.id("workOrders"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    photoType: v.union(
      v.literal("before"),
      v.literal("during"),
      v.literal("after")
    ),
    uploadedAt: v.number(),
  }).index("by_work_order", ["workOrderId"]),

  // Ratings given by owners to mechanics
  ratings: defineTable({
    workOrderId: v.id("workOrders"),
    ownerId: v.id("users"),
    mechanicId: v.id("users"),
    rating: v.number(), // 1-5
    review: v.optional(v.string()),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_owner", ["ownerId"]),

  // Mechanic authorizations for vessels
  mechanicAuthorizations: defineTable({
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    authorizedAt: v.number(),
    authorizedBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_vessel", ["vesselId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_vessel_mechanic", ["vesselId", "mechanicId"]),
});
