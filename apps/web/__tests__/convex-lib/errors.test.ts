/**
 * Unit tests for convex/lib/errors.ts.
 *
 * Verifies each Errors factory creates a ConvexError-like object with the
 * correct message/data. We mock the `convex` package's ConvexError so these
 * tests run without a Convex runtime.
 */

// Provide a ConvexError stand-in that stores data as-is and sets .message.
jest.mock("convex", () => ({
  ConvexError: class ConvexError extends Error {
    data: unknown;
    constructor(data: unknown) {
      super(typeof data === "string" ? data : JSON.stringify(data));
      this.data = data;
      this.name = "ConvexError";
    }
  },
}));

import { Errors } from "convex-lib/errors";

describe("Errors.notAuthenticated", () => {
  it("creates error with correct message", () => {
    const err = Errors.notAuthenticated();
    expect(err.data).toBe("Not authenticated");
  });
});

describe("Errors.accessDenied", () => {
  it("creates error with correct message", () => {
    const err = Errors.accessDenied();
    expect(err.data).toBe("Access denied");
  });
});

describe("Errors.notFound", () => {
  it("interpolates entity name", () => {
    expect(Errors.notFound("Vessel").data).toBe("Vessel not found");
    expect(Errors.notFound("Work order").data).toBe("Work order not found");
  });
});

describe("Errors.conflict", () => {
  it("passes through the provided message", () => {
    expect(Errors.conflict("Duplicate entry").data).toBe("Duplicate entry");
  });
});

describe("Errors.validation", () => {
  it("passes through the provided message", () => {
    expect(Errors.validation("Field is required").data).toBe(
      "Field is required"
    );
  });
});

describe("Errors.internal", () => {
  it("creates generic error without leaking internals", () => {
    const err = Errors.internal();
    expect(err.data).toBe("An unexpected error occurred");
    // Must not expose stack traces or system details
    expect(String(err.data)).not.toMatch(/Error:|at |stack/i);
  });
});
