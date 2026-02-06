// QR Captain Utility Functions

/**
 * Format a date as a readable string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Calculate total cost from parts and labor
 */
export function calculateTotalCost(
  parts: Array<{ quantity: number; unitCost?: number }>,
  laborHours?: number,
  laborRate?: number
): number {
  const partsCost = parts.reduce((total, part) => {
    return total + part.quantity * (part.unitCost || 0);
  }, 0);

  const laborCost = (laborHours || 0) * (laborRate || 0);

  return partsCost + laborCost;
}

/**
 * Get display name from firstName and lastName
 * Falls back to name or "Unknown" if no name fields provided
 */
export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  if (user.lastName) {
    return user.lastName;
  }
  if (user.name) {
    return user.name;
  }
  return "Unknown";
}

/**
 * Get initials from firstName and lastName (or fall back to name)
 */
export function getInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
} | string): string {
  // Handle legacy string input for backward compatibility
  if (typeof user === 'string') {
    return user
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Use firstName and lastName
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase();
  }
  if (user.lastName) {
    return user.lastName.slice(0, 2).toUpperCase();
  }
  if (user.name) {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return "??";
}

/**
 * Generate a display-friendly vessel name
 */
export function getVesselDisplayName(vessel: {
  name: string;
  year: number;
  make: string;
  model: string;
}): string {
  return `${vessel.name} (${vessel.year} ${vessel.make} ${vessel.model})`;
}

/**
 * Check if a warranty is expired
 */
export function isWarrantyExpired(warrantyExpiry?: number): boolean {
  if (!warrantyExpiry) return false;
  return warrantyExpiry < Date.now();
}

/**
 * Get days until warranty expires
 */
export function getDaysUntilWarrantyExpires(warrantyExpiry?: number): number | null {
  if (!warrantyExpiry) return null;
  const diff = warrantyExpiry - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate QR code URL for deep linking
 */
export function generateQRCodeUrl(qrCodeData: string, baseUrl: string): string {
  return `${baseUrl}/vessel/${encodeURIComponent(qrCodeData)}`;
}
