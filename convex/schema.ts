import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extended user profile
  users: defineTable({
    // Convex Auth standard fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // App specific fields - Made optional to debug auth errors
    fullName: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("owner"),
        v.literal("mechanic")
      )
    ),
    companyName: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isActive: v.optional(v.boolean()),
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

  // Equipment catalog for each vessel - 15 categories for comprehensive tracking
  vesselEquipment: defineTable({
    vesselId: v.id("vessels"),
    category: v.union(
      v.literal("propulsion"),     // Main Engine, Outboard Motors, Propellers, Transmission
      v.literal("electrical"),     // Batteries, Generator, Solar Panels, Shore Power
      v.literal("electronics"),    // Navigation: GPS, VHF Radio, Radar, Autopilot
      v.literal("plumbing"),       // Fresh Water, Heads, Bilge Pumps, Seacocks
      v.literal("fuel"),           // Fuel Tanks, Fuel Filters, Fuel Lines
      v.literal("hvac"),           // AC Units, Heating, Ventilation
      v.literal("deck"),           // Windlass, Anchors, Winches, Swim Platform
      v.literal("safety"),         // Life Jackets, Fire Extinguishers, Flares, Life Raft
      v.literal("steering"),       // Hydraulic System, Rudders, Trim Tabs
      v.literal("hull"),           // Anti-fouling, Zincs, Thru-hulls
      v.literal("canvas"),         // Bimini, Enclosure, Covers
      v.literal("galley"),         // Stove, Refrigerator, Microwave
      v.literal("entertainment"),  // Stereo, Speakers, TV, Lighting
      v.literal("rigging"),        // Mast, Boom, Standing Rigging, Sails
      v.literal("tender")          // Dinghy, Water Toys, Dive Equipment
    ),
    name: v.string(),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    
    // Installation & Purchase
    installationDate: v.optional(v.number()),     // Timestamp of installation
    yearInstalled: v.optional(v.number()),        // Year for backward compatibility
    purchaseDate: v.optional(v.number()),
    
    // Warranty
    warrantyExpiry: v.optional(v.number()),       // Timestamp
    warrantyTerms: v.optional(v.string()),        // Description of warranty terms
    
    // Service Tracking - Date based
    lastServiceDate: v.optional(v.number()),      // Timestamp of last service
    nextServiceDate: v.optional(v.number()),      // Timestamp of next scheduled service
    serviceIntervalDays: v.optional(v.number()),  // Days between services
    
    // Service Tracking - Hours based (for engines, etc.)
    hoursAtInstall: v.optional(v.number()),       // Equipment hours at installation
    currentHours: v.optional(v.number()),         // Current equipment hours
    lastServiceHours: v.optional(v.number()),     // Hours at last service
    serviceIntervalHours: v.optional(v.number()), // Hours between services
    
    // Condition Status
    conditionStatus: v.optional(
      v.union(
        v.literal("good"),
        v.literal("fair"),
        v.literal("needs_attention")
      )
    ),
    
    // Consumables & Parts
    consumablePartNumbers: v.optional(v.array(v.object({
      name: v.string(),                           // e.g., "Oil Filter", "Impeller"
      partNumber: v.string(),                     // Manufacturer part number
      manufacturer: v.optional(v.string()),
      notes: v.optional(v.string()),
    }))),
    
    notes: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_vessel", ["vesselId"])
    .index("by_vessel_category", ["vesselId", "category"]),

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

  // Access requests from mechanics to vessel owners
  accessRequests: defineTable({
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    ownerId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied")
    ),
    requestMessage: v.optional(v.string()),  // Message from mechanic
    responseMessage: v.optional(v.string()), // Message from owner
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_vessel", ["vesselId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_mechanic_status", ["mechanicId", "status"])
    .index("by_vessel_mechanic", ["vesselId", "mechanicId"]),

  // Notifications for users
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("access_request"),      // Mechanic requested access
      v.literal("access_approved"),     // Owner approved access
      v.literal("access_denied"),       // Owner denied access
      v.literal("work_order_started"),  // Mechanic started work
      v.literal("work_order_completed"),// Mechanic completed work
      v.literal("new_message")          // New message received
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),  // ID of related entity (request, work order, etc.)
    relatedType: v.optional(v.string()), // Type of related entity
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"]),

  // Messages between owners and mechanics
  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    vesselId: v.optional(v.id("vessels")),  // Context: which vessel
    accessRequestId: v.optional(v.id("accessRequests")),  // Context: which request
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_access_request", ["accessRequestId"])
    .index("by_vessel_participants", ["vesselId", "senderId", "receiverId"]),
});
