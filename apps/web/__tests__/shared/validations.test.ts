/**
 * Unit tests for packages/shared/src/validations.ts.
 *
 * These schemas are used on the frontend to validate form data before submission.
 * Tests verify both happy-path success and each failure mode.
 */

import {
  createUserSchema,
  updateUserSchema,
  userRoleSchema,
  createVesselSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
  createPartSchema,
  createRatingSchema,
  createEquipmentSchema,
  equipmentCategorySchema,
  vesselTypeSchema,
} from "@qrcaptain/shared";

// ─── userRoleSchema ───────────────────────────────────────────────────────────

describe("userRoleSchema", () => {
  it("accepts valid roles", () => {
    expect(userRoleSchema.parse("admin")).toBe("admin");
    expect(userRoleSchema.parse("owner")).toBe("owner");
    expect(userRoleSchema.parse("mechanic")).toBe("mechanic");
  });

  it("rejects unknown roles", () => {
    expect(() => userRoleSchema.parse("superuser")).toThrow();
    expect(() => userRoleSchema.parse("")).toThrow();
  });
});

// ─── createUserSchema ─────────────────────────────────────────────────────────

describe("createUserSchema", () => {
  const valid = {
    email: "user@example.com",
    firstName: "Jane",
    lastName: "Doe",
    password: "securepassword1",
    role: "owner" as const,
  };

  it("accepts valid input", () => {
    expect(() => createUserSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => createUserSchema.parse({ ...valid, email: "not-an-email" })).toThrow(
      "Invalid email address"
    );
  });

  it("rejects empty first name", () => {
    expect(() => createUserSchema.parse({ ...valid, firstName: "" })).toThrow(
      "First name is required"
    );
  });

  it("rejects empty last name", () => {
    expect(() => createUserSchema.parse({ ...valid, lastName: "" })).toThrow(
      "Last name is required"
    );
  });

  it("rejects password shorter than 8 characters", () => {
    expect(() => createUserSchema.parse({ ...valid, password: "short" })).toThrow(
      "Password must be at least 8 characters"
    );
  });

  it("rejects invalid role", () => {
    expect(() => createUserSchema.parse({ ...valid, role: "guest" })).toThrow();
  });
});

// ─── updateUserSchema ─────────────────────────────────────────────────────────

describe("updateUserSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(() => updateUserSchema.parse({})).not.toThrow();
  });

  it("accepts partial updates", () => {
    expect(() =>
      updateUserSchema.parse({ firstName: "John", companyName: "Acme Marine" })
    ).not.toThrow();
  });

  it("rejects empty firstName when provided", () => {
    expect(() => updateUserSchema.parse({ firstName: "" })).toThrow();
  });
});

// ─── createVesselSchema ───────────────────────────────────────────────────────

describe("createVesselSchema", () => {
  const valid = {
    name: "Sea Spirit",
    make: "Bayliner",
    model: "Element E18",
    year: 2020,
    vesselType: "powerboat",
  };

  it("accepts valid input", () => {
    expect(() => createVesselSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty vessel name", () => {
    expect(() => createVesselSchema.parse({ ...valid, name: "" })).toThrow(
      "Vessel name is required"
    );
  });

  it("rejects year before 1900", () => {
    expect(() => createVesselSchema.parse({ ...valid, year: 1899 })).toThrow();
  });

  it("accepts optional fields", () => {
    expect(() =>
      createVesselSchema.parse({
        ...valid,
        registrationNumber: "FL1234AB",
        hullId: "BAYL1234X020",
        notes: "Engine replaced 2023",
      })
    ).not.toThrow();
  });
});

// ─── vesselTypeSchema ─────────────────────────────────────────────────────────

describe("vesselTypeSchema", () => {
  const validTypes = ["sailboat", "powerboat", "yacht", "fishing", "pontoon", "jetski", "other"];

  it.each(validTypes)("accepts %s", (type) => {
    expect(() => vesselTypeSchema.parse(type)).not.toThrow();
  });

  it("rejects unknown type", () => {
    expect(() => vesselTypeSchema.parse("hovercraft")).toThrow();
  });
});

// ─── createWorkOrderSchema ────────────────────────────────────────────────────

describe("createWorkOrderSchema", () => {
  const valid = {
    vesselId: "abc123",
    description: "Engine is making a knocking sound at idle speed",
  };

  it("accepts valid input", () => {
    expect(() => createWorkOrderSchema.parse(valid)).not.toThrow();
  });

  it("rejects description shorter than 10 characters", () => {
    expect(() =>
      createWorkOrderSchema.parse({ ...valid, description: "Fix it" })
    ).toThrow("Description must be at least 10 characters");
  });

  it("rejects missing vesselId", () => {
    expect(() => createWorkOrderSchema.parse({ description: valid.description })).toThrow();
  });
});

// ─── updateWorkOrderSchema ────────────────────────────────────────────────────

describe("updateWorkOrderSchema", () => {
  it("accepts empty object", () => {
    expect(() => updateWorkOrderSchema.parse({})).not.toThrow();
  });

  it("rejects negative laborHours", () => {
    expect(() => updateWorkOrderSchema.parse({ laborHours: -1 })).toThrow();
  });

  it("rejects negative laborRate", () => {
    expect(() => updateWorkOrderSchema.parse({ laborRate: -0.01 })).toThrow();
  });

  it("rejects negative totalCost", () => {
    expect(() => updateWorkOrderSchema.parse({ totalCost: -100 })).toThrow();
  });

  it("accepts zero as valid for cost fields", () => {
    expect(() =>
      updateWorkOrderSchema.parse({ laborHours: 0, laborRate: 0, totalCost: 0 })
    ).not.toThrow();
  });
});

// ─── createPartSchema ─────────────────────────────────────────────────────────

describe("createPartSchema", () => {
  const valid = {
    workOrderId: "wo123",
    name: "Fuel Filter",
    quantity: 2,
  };

  it("accepts valid input", () => {
    expect(() => createPartSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty part name", () => {
    expect(() => createPartSchema.parse({ ...valid, name: "" })).toThrow(
      "Part name is required"
    );
  });

  it("rejects quantity below 1", () => {
    expect(() => createPartSchema.parse({ ...valid, quantity: 0 })).toThrow(
      "Quantity must be at least 1"
    );
  });

  it("rejects negative unit cost", () => {
    expect(() =>
      createPartSchema.parse({ ...valid, unitCost: -10 })
    ).toThrow();
  });

  it("accepts optional fields", () => {
    expect(() =>
      createPartSchema.parse({
        ...valid,
        partNumber: "FF-4780",
        manufacturer: "WIX",
        serialNumber: "SN12345",
        unitCost: 14.99,
        warrantyTerms: "1 year manufacturer warranty",
      })
    ).not.toThrow();
  });
});

// ─── createRatingSchema ───────────────────────────────────────────────────────

describe("createRatingSchema", () => {
  const valid = { workOrderId: "wo123", rating: 5 };

  it("accepts ratings 1–5", () => {
    [1, 2, 3, 4, 5].forEach((r) => {
      expect(() => createRatingSchema.parse({ ...valid, rating: r })).not.toThrow();
    });
  });

  it("rejects rating below 1", () => {
    expect(() => createRatingSchema.parse({ ...valid, rating: 0 })).toThrow();
  });

  it("rejects rating above 5", () => {
    expect(() => createRatingSchema.parse({ ...valid, rating: 6 })).toThrow();
  });

  it("accepts optional review text", () => {
    expect(() =>
      createRatingSchema.parse({ ...valid, review: "Excellent service!" })
    ).not.toThrow();
  });
});

// ─── equipmentCategorySchema ──────────────────────────────────────────────────

describe("equipmentCategorySchema", () => {
  const valid = ["engine", "electronics", "plumbing", "electrical", "hvac", "safety", "navigation", "other"];

  it.each(valid)("accepts %s", (cat) => {
    expect(() => equipmentCategorySchema.parse(cat)).not.toThrow();
  });

  it("rejects unknown category", () => {
    expect(() => equipmentCategorySchema.parse("fuel")).toThrow();
  });
});

// ─── createEquipmentSchema ────────────────────────────────────────────────────

describe("createEquipmentSchema", () => {
  const valid = {
    vesselId: "v123",
    category: "engine" as const,
    name: "Yanmar 4JH45",
  };

  it("accepts valid input", () => {
    expect(() => createEquipmentSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty equipment name", () => {
    expect(() => createEquipmentSchema.parse({ ...valid, name: "" })).toThrow(
      "Equipment name is required"
    );
  });

  it("rejects invalid category", () => {
    expect(() =>
      createEquipmentSchema.parse({ ...valid, category: "fuel" })
    ).toThrow();
  });
});
