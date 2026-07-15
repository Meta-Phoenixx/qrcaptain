import { ConvexError } from "convex/values";

/**
 * Standardized error constructors.
 * Using ConvexError instead of raw Error ensures structured error data
 * reaches the client without leaking internal details.
 */
export const Errors = {
  notAuthenticated: () => new ConvexError("Not authenticated"),
  accessDenied: () => new ConvexError("Access denied"),
  notFound: (entity: string) => new ConvexError(`${entity} not found`),
  conflict: (message: string) => new ConvexError(message),
  validation: (message: string) => new ConvexError(message),
  internal: () => new ConvexError("An unexpected error occurred"),
} as const;
