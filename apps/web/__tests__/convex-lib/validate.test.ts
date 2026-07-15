/**
 * Unit tests for convex/lib/validate.ts.
 *
 * The module depends only on Errors.validation() from convex/lib/errors.ts.
 * We mock that dependency so these tests are pure logic — no Convex runtime needed.
 */

// Mock errors.ts before the module under test is loaded.
jest.mock("convex-lib/errors", () => ({
  Errors: {
    validation: (msg: string) => new Error(msg),
  },
}));

import {
  requireMaxLength,
  requirePositive,
  requireNonNegative,
  requireRange,
  clampLimit,
} from "convex-lib/validate";

// ─── requireMaxLength ─────────────────────────────────────────────────────────

describe("requireMaxLength", () => {
  it("does not throw for string within limit", () => {
    expect(() => requireMaxLength("hello", "Field", 10)).not.toThrow();
  });

  it("does not throw for string exactly at limit", () => {
    expect(() => requireMaxLength("hello", "Field", 5)).not.toThrow();
  });

  it("throws when string exceeds limit", () => {
    expect(() => requireMaxLength("hello world", "Description", 5)).toThrow(
      "Description must be 5 characters or fewer"
    );
  });

  it("includes the field name in the error message", () => {
    expect(() => requireMaxLength("x".repeat(201), "Vessel name", 200)).toThrow(
      "Vessel name must be 200 characters or fewer"
    );
  });

  it("does not throw for empty string", () => {
    expect(() => requireMaxLength("", "Content", 5000)).not.toThrow();
  });
});

// ─── requirePositive ──────────────────────────────────────────────────────────

describe("requirePositive", () => {
  it("does not throw for positive values", () => {
    expect(() => requirePositive(1, "Quantity")).not.toThrow();
    expect(() => requirePositive(0.1, "Labor hours")).not.toThrow();
    expect(() => requirePositive(9999, "Amount")).not.toThrow();
  });

  it("throws for zero", () => {
    expect(() => requirePositive(0, "Quantity")).toThrow(
      "Quantity must be greater than 0"
    );
  });

  it("throws for negative values", () => {
    expect(() => requirePositive(-1, "Labor hours")).toThrow(
      "Labor hours must be greater than 0"
    );
  });
});

// ─── requireNonNegative ───────────────────────────────────────────────────────

describe("requireNonNegative", () => {
  it("does not throw for zero", () => {
    expect(() => requireNonNegative(0, "Labor rate")).not.toThrow();
  });

  it("does not throw for positive values", () => {
    expect(() => requireNonNegative(100, "Unit cost")).not.toThrow();
  });

  it("throws for negative values", () => {
    expect(() => requireNonNegative(-0.01, "Labor rate")).toThrow(
      "Labor rate cannot be negative"
    );
  });
});

// ─── requireRange ─────────────────────────────────────────────────────────────

describe("requireRange", () => {
  it("does not throw for value at minimum boundary", () => {
    expect(() => requireRange(1, "Quantity", 1, 99999)).not.toThrow();
  });

  it("does not throw for value at maximum boundary", () => {
    expect(() => requireRange(99999, "Quantity", 1, 99999)).not.toThrow();
  });

  it("does not throw for value strictly within range", () => {
    expect(() => requireRange(50, "Labor hours", 0.1, 9999)).not.toThrow();
  });

  it("throws for value below minimum", () => {
    expect(() => requireRange(0, "Quantity", 1, 99999)).toThrow(
      "Quantity must be between 1 and 99999"
    );
  });

  it("throws for value above maximum", () => {
    expect(() => requireRange(100000, "Quantity", 1, 99999)).toThrow(
      "Quantity must be between 1 and 99999"
    );
  });

  it("includes field name in error message", () => {
    expect(() => requireRange(-1, "Total cost", 0, 9999999)).toThrow(
      "Total cost must be between 0 and 9999999"
    );
  });
});

// ─── clampLimit ───────────────────────────────────────────────────────────────

describe("clampLimit", () => {
  it("returns default when input is undefined", () => {
    expect(clampLimit(undefined, 100, 500)).toBe(100);
  });

  it("returns value as-is when within bounds", () => {
    expect(clampLimit(50, 100, 500)).toBe(50);
  });

  it("clamps to max when input exceeds max", () => {
    expect(clampLimit(9999, 100, 500)).toBe(500);
  });

  it("clamps to 1 when input is 0 or negative", () => {
    expect(clampLimit(0, 100, 500)).toBe(1);
    expect(clampLimit(-5, 100, 500)).toBe(1);
  });

  it("handles value exactly at max", () => {
    expect(clampLimit(500, 100, 500)).toBe(500);
  });
});
