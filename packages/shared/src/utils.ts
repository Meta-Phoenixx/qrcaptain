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
 * Get initials from a full name
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
