// QR Captain Constants

export const APP_NAME = "QR Captain";
export const APP_VERSION = "0.1.0";

// Role Display Names
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  owner: "Boat Owner",
  mechanic: "Marine Mechanic",
};

// Vessel Types
export const VESSEL_TYPES = [
  { value: "sailboat", label: "Sailboat" },
  { value: "powerboat", label: "Powerboat" },
  { value: "yacht", label: "Yacht" },
  { value: "fishing", label: "Fishing Boat" },
  { value: "pontoon", label: "Pontoon" },
  { value: "jetski", label: "Jet Ski / PWC" },
  { value: "other", label: "Other" },
] as const;

// Equipment Categories
export const EQUIPMENT_CATEGORIES = [
  { value: "engine", label: "Engine / Propulsion", icon: "⚙️" },
  { value: "electronics", label: "Electronics", icon: "📡" },
  { value: "plumbing", label: "Plumbing", icon: "🚿" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "hvac", label: "HVAC / Climate", icon: "❄️" },
  { value: "safety", label: "Safety Equipment", icon: "🛟" },
  { value: "navigation", label: "Navigation", icon: "🧭" },
  { value: "other", label: "Other", icon: "📦" },
] as const;

// Work Order Status
export const WORK_ORDER_STATUSES = [
  { value: "in_progress", label: "In Progress", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#10b981" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
] as const;

// Photo Types
export const PHOTO_TYPES = [
  { value: "before", label: "Before" },
  { value: "during", label: "During" },
  { value: "after", label: "After" },
] as const;

// Rating Labels
export const RATING_LABELS = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
] as const;
