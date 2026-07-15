import { Errors } from "./errors";

export function requireMaxLength(value: string, fieldName: string, max: number): void {
  if (value.length > max) {
    throw Errors.validation(`${fieldName} must be ${max} characters or fewer`);
  }
}

export function requirePositive(value: number, fieldName: string): void {
  if (value <= 0) throw Errors.validation(`${fieldName} must be greater than 0`);
}

export function requireNonNegative(value: number, fieldName: string): void {
  if (value < 0) throw Errors.validation(`${fieldName} cannot be negative`);
}

export function requireRange(value: number, fieldName: string, min: number, max: number): void {
  if (value < min || value > max) {
    throw Errors.validation(`${fieldName} must be between ${min} and ${max}`);
  }
}

// Convenience cap for query pagination args — prevents DoS via unlimited result sets.
export function clampLimit(requested: number | undefined, defaultVal: number, max: number): number {
  if (requested === undefined) return defaultVal;
  return Math.min(Math.max(1, requested), max);
}
