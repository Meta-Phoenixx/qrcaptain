import { z } from "zod";

// User Validations
export const userRoleSchema = z.enum(["admin", "owner", "mechanic"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema,
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// Vessel Validations
export const vesselTypeSchema = z.enum([
  "sailboat",
  "powerboat",
  "yacht",
  "fishing",
  "pontoon",
  "jetski",
  "other",
]);
export type VesselType = z.infer<typeof vesselTypeSchema>;

export const createVesselSchema = z.object({
  name: z.string().min(1, "Vessel name is required"),
  registrationNumber: z.string().optional(),
  hullId: z.string().optional(),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  vesselType: z.string(),
  notes: z.string().optional(),
});

// Equipment Validations
export const equipmentCategorySchema = z.enum([
  "engine",
  "electronics",
  "plumbing",
  "electrical",
  "hvac",
  "safety",
  "navigation",
  "other",
]);
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;

export const createEquipmentSchema = z.object({
  vesselId: z.string(),
  category: equipmentCategorySchema,
  name: z.string().min(1, "Equipment name is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.number().optional(),
  warrantyExpiry: z.number().optional(),
  notes: z.string().optional(),
});

// Work Order Validations
export const workOrderStatusSchema = z.enum([
  "in_progress",
  "completed",
  "cancelled",
]);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const createWorkOrderSchema = z.object({
  vesselId: z.string(),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export const updateWorkOrderSchema = z.object({
  description: z.string().optional(),
  diagnosis: z.string().optional(),
  workPerformed: z.string().optional(),
  laborHours: z.number().min(0).optional(),
  laborRate: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
});

// Parts Validations
export const createPartSchema = z.object({
  workOrderId: z.string(),
  name: z.string().min(1, "Part name is required"),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0).optional(),
  warrantyExpiry: z.number().optional(),
  warrantyTerms: z.string().optional(),
});

// Rating Validations
export const createRatingSchema = z.object({
  workOrderId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

// Photo Validations
export const photoTypeSchema = z.enum(["before", "during", "after"]);
export type PhotoType = z.infer<typeof photoTypeSchema>;
