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

    // ============ SHARED PROFILE FIELDS ============
    
    // Profile images (used by both owners and mechanics)
    profilePhotoStorageId: v.optional(v.id("_storage")),  // Personal photo
    
    // Personal address (used by owners)
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
    
    // Onboarding status (used by both owners and mechanics)
    onboardingCompleted: v.optional(v.boolean()),
    onboardingCompletedAt: v.optional(v.number()),
    onboardingSkippedAt: v.optional(v.number()),  // Track if/when they skipped
    lastOnboardingReminder: v.optional(v.number()), // For reminder throttling
    
    // ============ MECHANIC-SPECIFIC FIELDS ============
    
    companyLogoStorageId: v.optional(v.id("_storage")),   // Company logo (mechanics only)
    
    // Required for onboarding completion
    businessYearsInOperation: v.optional(v.number()),     // How long in business
    businessLicenseNumber: v.optional(v.string()),        // Business license #
    businessAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.optional(v.string()),
    })),
    serviceAreas: v.optional(v.array(v.string())),        // Geographic regions served
    serviceTypes: v.optional(v.array(v.string())),        // Types of services offered
    hoursOfOperation: v.optional(v.object({
      monday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
    })),
    
    // Optional mechanic profile enhancements
    certifications: v.optional(v.array(v.string())),      // EPA, Yamaha, Mercury, etc.
    googleMyBusinessUrl: v.optional(v.string()),          // GMB profile link
    websiteUrl: v.optional(v.string()),                   // Company website
    isInsured: v.optional(v.boolean()),                   // Has insurance
    isBonded: v.optional(v.boolean()),                    // Is bonded
    specializations: v.optional(v.array(v.string())),     // Engine, electrical, etc.
    hasMobileCapabilities: v.optional(v.boolean()),       // Can come to vessel
    languagesSpoken: v.optional(v.array(v.string())),     // Languages
    bio: v.optional(v.string()),                          // About the mechanic/company
    
    // ============ MECHANIC AVAILABILITY STATUS ============
    availabilityStatus: v.optional(v.union(
      v.literal("available"),      // Open for new work
      v.literal("limited"),        // Taking selective jobs
      v.literal("at_capacity"),    // Fully booked
      v.literal("unavailable")     // Not taking work
    )),
    availabilityStatusUpdatedAt: v.optional(v.number()),  // When status was last updated
    isAvailabilityManuallySet: v.optional(v.boolean()),   // True if manually set (vs auto-calculated)
    maxConcurrentJobs: v.optional(v.number()),            // Threshold for auto-calculation
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_onboarding_status", ["role", "onboardingCompleted"]),

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

  // Work orders created by mechanics or requested by owners
  workOrders: defineTable({
    vesselId: v.id("vessels"),
    mechanicId: v.id("users"),
    status: v.union(
      v.literal("quote_requested"),  // Owner requested work, awaiting mechanic quote
      v.literal("quoted"),           // Mechanic provided quote, awaiting owner approval
      v.literal("declined"),         // Mechanic declined the request
      v.literal("in_progress"),      // Work is being done
      v.literal("completed"),        // Work finished
      v.literal("cancelled")         // Cancelled by either party
    ),
    description: v.string(),
    diagnosis: v.optional(v.string()),
    workPerformed: v.optional(v.string()),
    laborHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    
    // ============ OWNER REQUEST FIELDS ============
    requestedByOwnerId: v.optional(v.id("users")),        // Owner who initiated the request
    urgency: v.optional(v.union(
      v.literal("routine"),          // No rush, schedule when convenient
      v.literal("soon"),             // Within the next week or two
      v.literal("urgent")            // ASAP
    )),
    equipmentId: v.optional(v.id("vesselEquipment")),     // Related equipment if specified
    
    // ============ QUOTE FIELDS ============
    quotedLaborHours: v.optional(v.number()),             // Estimated labor hours
    quotedLaborRate: v.optional(v.number()),              // Mechanic's hourly rate
    quotedPartsEstimate: v.optional(v.number()),          // Estimated parts cost
    quotedTotalEstimate: v.optional(v.number()),          // Total estimated cost
    quoteNotes: v.optional(v.string()),                   // Mechanic's notes on the quote
    quotedAt: v.optional(v.number()),                     // When quote was submitted
    quoteExpiresAt: v.optional(v.number()),               // Quote expiration timestamp
    estimatedCompletionDate: v.optional(v.number()),      // Estimated date of work completion
    
    // ============ UPDATE NOTIFICATION THROTTLING ============
    lastUpdateNotifiedAt: v.optional(v.number()),         // Throttle owner notifications
    
    // ============ DECLINE FIELDS ============
    declineReason: v.optional(v.string()),                // Why mechanic declined
    declinedAt: v.optional(v.number()),                   // When request was declined
  })
    .index("by_vessel", ["vesselId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_status", ["status"])
    .index("by_requested_owner", ["requestedByOwnerId"]),

  // Parts used in work orders
  workOrderParts: defineTable({
    workOrderId: v.id("workOrders"),
    name: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    category: v.optional(v.string()),     // Part category
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    warrantyTerms: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")), // Photo of the part
    addedAt: v.optional(v.number()),      // When part was added
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

  // Parts catalog database - grows as mechanics add parts
  partsDatabase: defineTable({
    partNumber: v.string(),
    name: v.string(),
    manufacturer: v.string(),
    category: v.union(
      v.literal("engine"),
      v.literal("electrical"),
      v.literal("plumbing"),
      v.literal("fuel"),
      v.literal("cooling"),
      v.literal("steering"),
      v.literal("hvac"),
      v.literal("safety"),
      v.literal("general")
    ),
    description: v.optional(v.string()),
    averagePrice: v.optional(v.number()),
    isSeeded: v.boolean(),      // true for pre-populated, false for user-added
    usageCount: v.number(),     // track popularity
    createdAt: v.number(),
  })
    .index("by_manufacturer", ["manufacturer"])
    .index("by_category", ["category"])
    .index("by_partNumber", ["partNumber"])
    .index("by_usage", ["usageCount"])
    .searchIndex("search_parts", { 
      searchField: "name", 
      filterFields: ["manufacturer", "category"] 
    }),

  // Legacy ratings table (kept for backward compatibility)
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

  // ============ DUAL RATING SYSTEM ============
  
  // Mechanic ratings (owners rate mechanics) - displayed with wrench icons
  mechanicRatings: defineTable({
    workOrderId: v.id("workOrders"),
    ownerId: v.id("users"),           // The owner giving the rating
    mechanicId: v.id("users"),        // The mechanic being rated
    
    // Individual criteria ratings (1-5)
    qualityRating: v.number(),        // Quality of work - Did they fix it right?
    communicationRating: v.number(),  // Responsiveness and clarity
    professionalismRating: v.number(),// On time, clean, courteous
    valueRating: v.number(),          // Fair pricing for work performed
    
    // Overall rating (auto-calculated average, can be adjusted by user)
    overallRating: v.number(),        // 1-5, displayed as wrenches
    
    review: v.optional(v.string()),   // Written review
    createdAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_owner", ["ownerId"])
    .index("by_mechanic_created", ["mechanicId", "createdAt"]),

  // Owner ratings (mechanics rate owners) - displayed with star icons
  ownerRatings: defineTable({
    workOrderId: v.id("workOrders"),
    mechanicId: v.id("users"),        // The mechanic giving the rating
    ownerId: v.id("users"),           // The owner being rated
    
    // Individual criteria ratings (1-5)
    communicationRating: v.number(),  // Clear about needs, responsive to questions
    preparednessRating: v.number(),   // Vessel accessible, info provided
    paymentRating: v.number(),        // Timely and fair payment
    respectRating: v.number(),        // Professional and courteous treatment
    
    // Overall rating (auto-calculated average, can be adjusted by user)
    overallRating: v.number(),        // 1-5, displayed as stars
    
    review: v.optional(v.string()),   // Written review
    createdAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_owner", ["ownerId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_owner_created", ["ownerId", "createdAt"]),

  // ============ PREFERRED MECHANICS ============
  
  // Owner's preferred mechanic list (separate from vessel-level authorizations)
  preferredMechanics: defineTable({
    ownerId: v.id("users"),           // The owner
    mechanicId: v.id("users"),        // The preferred mechanic
    addedAt: v.number(),              // When added to preferred list
    notes: v.optional(v.string()),    // Owner's private notes about this mechanic
  })
    .index("by_owner", ["ownerId"])
    .index("by_mechanic", ["mechanicId"])
    .index("by_owner_mechanic", ["ownerId", "mechanicId"]),

  // ============ MECHANIC METRICS ============
  
  // Cached metrics for mechanics (updated periodically)
  mechanicMetrics: defineTable({
    mechanicId: v.id("users"),
    
    // Response time metrics
    avgResponseTimeMinutes: v.optional(v.number()),   // Average time to respond to messages
    responseTimeCalculatedAt: v.optional(v.number()), // When response time was calculated
    
    // Job metrics
    totalJobsCompleted: v.number(),                   // Total completed work orders
    totalJobsCancelled: v.optional(v.number()),       // Total cancelled work orders
    
    // Rating summary (cached for performance)
    avgOverallRating: v.optional(v.number()),         // Average overall wrench rating
    totalRatings: v.number(),                         // Number of ratings received
    
    updatedAt: v.number(),                            // Last metrics update
  })
    .index("by_mechanic", ["mechanicId"]),

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
      // Access-related
      v.literal("access_request"),           // Mechanic requested access
      v.literal("access_approved"),          // Owner approved access
      v.literal("access_denied"),            // Owner denied access
      v.literal("access_revoked"),           // Owner revoked mechanic access
      
      // Work order lifecycle
      v.literal("work_order_started"),       // Mechanic started work
      v.literal("work_order_completed"),     // Mechanic completed work
      v.literal("work_order_updated"),       // Mechanic updated work order progress
      
      // Quote workflow (owner-initiated work orders)
      v.literal("work_order_requested"),     // Mechanic receives request from owner
      v.literal("quote_submitted"),          // Owner receives quote from mechanic
      v.literal("quote_accepted"),           // Mechanic notified of quote acceptance
      v.literal("quote_declined"),           // Mechanic notified of quote decline
      v.literal("request_declined"),         // Owner notified mechanic declined request
      
      // Messaging
      v.literal("new_message"),              // New message received
      
      // Ratings
      v.literal("rate_mechanic_reminder"),   // Prompt owner to rate mechanic
      v.literal("rate_owner_reminder"),      // Prompt mechanic to rate owner
      v.literal("new_rating_received"),      // You received a new rating
      
      // Preferred mechanics
      v.literal("added_to_preferred_list"),  // Mechanic added by owner (includes QR codes)
      
      // Onboarding
      v.literal("onboarding_reminder")       // Reminder to complete profile
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
    workOrderId: v.optional(v.id("workOrders")),  // Context: which work order
    content: v.string(),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),         // Timestamp when message was read (for response time calc)
    createdAt: v.number(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_access_request", ["accessRequestId"])
    .index("by_vessel_participants", ["vesselId", "senderId", "receiverId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_receiver_created", ["receiverId", "createdAt"]),

  // ============================================
  // APP SETTINGS (Admin configurable)
  // ============================================
  appSettings: defineTable({
    key: v.string(),                           // Setting identifier
    value: v.string(),                         // JSON-encoded value
    description: v.string(),                   // Human-readable description
    category: v.union(
      v.literal("notifications"),              // Notification-related settings
      v.literal("system"),                     // System-wide settings
      v.literal("mechanics"),                  // Mechanic-related settings
      v.literal("owners"),                     // Owner-related settings
      v.literal("work_orders")                 // Work order settings
    ),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),      // Admin who last updated
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // ============================================
  // ANNOUNCEMENTS (Admin broadcasts)
  // ============================================
  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("info"),          // General information
      v.literal("feature"),       // New feature announcement
      v.literal("maintenance"),   // Scheduled maintenance
      v.literal("tip"),           // Seasonal/helpful tips
      v.literal("urgent")         // Critical alerts
    ),
    targetRoles: v.array(v.union(
      v.literal("owner"),
      v.literal("mechanic"),
      v.literal("admin"),
      v.literal("all")
    )),
    isActive: v.boolean(),
    isPinned: v.boolean(),        // Show at top
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_active", ["isActive"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  // Track which announcements users have dismissed
  announcementDismissals: defineTable({
    userId: v.id("users"),
    announcementId: v.id("announcements"),
    dismissedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_announcement", ["userId", "announcementId"]),

  // ============================================
  // HELP GUIDES (In-app documentation)
  // ============================================
  helpGuides: defineTable({
    title: v.string(),
    summary: v.string(),
    content: v.string(),          // Markdown content
    category: v.union(
      v.literal("getting_started"),
      v.literal("vessels"),
      v.literal("work_orders"),
      v.literal("mechanics"),
      v.literal("equipment"),
      v.literal("billing"),
      v.literal("troubleshooting")
    ),
    targetRoles: v.array(v.union(
      v.literal("owner"),
      v.literal("mechanic"),
      v.literal("admin")
    )),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_sort_order", ["sortOrder"]),
});
