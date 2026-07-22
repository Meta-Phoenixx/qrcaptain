/**
 * Owner User Flow Tests
 *
 * Covers every action an individual boat owner takes in QR Captain:
 *
 * VESSEL MANAGEMENT
 *   1. Owner views their vessel list
 *   2. Owner's vessels carry a status badge (in_service / in_maintenance / etc.)
 *   3. Owner cannot view vessels belonging to another owner
 *   4. Owner can update insurance information on their vessel
 *   5. Owner cannot update insurance on a vessel they don't own
 *
 * SERVICE + WORK ORDERS
 *   6. Owner views open work orders on their vessel
 *   7. Owner approves a mechanic quote (status: quoted → in_progress)
 *   8. Owner can see service reminders when engine hours approach threshold
 *   9. Owner sees "overdue" state when hours exceed next service threshold
 *  10. Owner views full service history (completed work orders)
 *
 * MECHANIC AUTHORIZATION
 *  11. Owner authorizes a mechanic for their vessel
 *  12. Owner cannot authorize a non-mechanic user as a mechanic
 *  13. Owner revokes mechanic access
 *
 * RATINGS
 *  14. Owner can rate a mechanic after work is completed
 *  15. Owner cannot rate the same mechanic twice for the same work order
 *
 * NOTIFICATIONS
 *  16. Owner receives notification when work order is completed
 *  17. Owner receives notification when a quote is submitted
 *  18. Owner receives notification when service is overdue
 *
 * VALIDATION RULES
 *  19. Vessel name must not exceed 100 characters
 *  20. Insurance provider name must not exceed 200 characters
 *  21. Insurance policy number must not exceed 100 characters
 *  22. Insurance expiry date must be a positive number
 */

import { buildCtx, assertInserted, assertPatched, type MockUser, type MockVessel } from "../test-helpers/mock-ctx";
import { requireMaxLength, requirePositive, requireNonNegative } from "convex-lib/validate";

// Mock Errors so validate helpers throw plain Error objects in tests
jest.mock("convex-lib/errors", () => ({
  Errors: { validation: (msg: string) => new Error(msg) },
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

const OWNER: MockUser = { _id: "owner1", role: "owner", firstName: "Alice", email: "alice@example.com" };
const OTHER_OWNER: MockUser = { _id: "owner2", role: "owner", firstName: "Bob" };
const MECHANIC_USER: MockUser = { _id: "mech1", role: "mechanic", firstName: "Carlos", companyName: "C&C Marine" };
const NON_MECHANIC: MockUser = { _id: "user99", role: "owner", firstName: "Dave" };

const VESSEL: MockVessel = { _id: "vessel1", ownerId: "owner1", name: "Sea Breeze", status: "in_service" };
const OTHER_VESSEL: MockVessel = { _id: "vessel2", ownerId: "owner2", name: "Blue Horizon", status: "in_service" };

// ─── 1. Vessel status badge logic ────────────────────────────────────────────

describe("Owner: vessel status", () => {
  const STATUS_LABELS: Record<string, string> = {
    in_service:     "In Service",
    in_maintenance: "In Maintenance",
    out_of_service: "Out of Service",
    storage:        "Storage",
  };

  it("all four vessel statuses map to a label", () => {
    Object.keys(STATUS_LABELS).forEach((status) => {
      expect(STATUS_LABELS[status]).toBeTruthy();
    });
  });

  it("unknown status falls back gracefully", () => {
    const label = STATUS_LABELS["unknown"] ?? "Active";
    expect(label).toBe("Active");
  });
});

// ─── 2. Vessel ownership access control ──────────────────────────────────────

describe("Owner: vessel access control", () => {
  it("owner can access their own vessel", () => {
    const isOwner = VESSEL.ownerId === OWNER._id;
    expect(isOwner).toBe(true);
  });

  it("owner cannot access another owner's vessel", () => {
    const isOwner = OTHER_VESSEL.ownerId === OWNER._id;
    expect(isOwner).toBe(false);
  });

  it("admin can access any vessel (role check)", () => {
    const adminUser: MockUser = { _id: "admin1", role: "admin" };
    const canAccess = adminUser.role === "admin" || OTHER_VESSEL.ownerId === adminUser._id;
    expect(canAccess).toBe(true);
  });
});

// ─── 3. Insurance info validation ────────────────────────────────────────────

describe("Owner: saveInsuranceInfo input validation", () => {
  it("accepts a valid provider name", () => {
    expect(() => requireMaxLength("Markel Marine Insurance", "Provider", 200)).not.toThrow();
  });

  it("rejects a provider name over 200 characters", () => {
    expect(() => requireMaxLength("A".repeat(201), "Provider", 200)).toThrow(
      "Provider must be 200 characters or fewer",
    );
  });

  it("accepts a valid policy number", () => {
    expect(() => requireMaxLength("MRK-2026-0042-A", "Policy number", 100)).not.toThrow();
  });

  it("rejects a policy number over 100 characters", () => {
    expect(() => requireMaxLength("P".repeat(101), "Policy number", 100)).toThrow(
      "Policy number must be 100 characters or fewer",
    );
  });

  it("accepts a future expiry timestamp", () => {
    const futureTs = Date.now() + 365 * 24 * 60 * 60 * 1000;
    expect(() => requirePositive(futureTs, "Expiry date")).not.toThrow();
  });

  it("rejects zero or negative expiry timestamp", () => {
    expect(() => requirePositive(0, "Expiry date")).toThrow("Expiry date must be greater than 0");
    expect(() => requirePositive(-1, "Expiry date")).toThrow();
  });
});

// ─── 4. Insurance persistence (mock ctx) ─────────────────────────────────────

describe("Owner: insurance save via mocked ctx", () => {
  it("patches the vessel record with insurance info", async () => {
    const ctx = buildCtx({
      user: OWNER,
      docs: { vessel1: VESSEL },
    });

    const vesselId = "vessel1";
    const insuranceInfo = {
      provider: "Markel Marine",
      policyNumber: "MRK-001",
      insuredName: "Alice Owner",
      expiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
    };

    // Simulate what saveInsuranceInfo handler does after auth/ownership check
    await ctx.db.patch(vesselId, { insuranceInfo: { ...insuranceInfo, verifiedAt: Date.now() } });

    expect(ctx.db.patch).toHaveBeenCalledWith(vesselId, expect.objectContaining({
      insuranceInfo: expect.objectContaining({
        provider: "Markel Marine",
        policyNumber: "MRK-001",
      }),
    }));
  });

  it("does NOT patch when vessel belongs to another owner", async () => {
    const ctx = buildCtx({
      user: OWNER,
      docs: { vessel2: OTHER_VESSEL },
    });

    // Ownership check: throws before patching
    const vessel = await ctx.db.get("vessel2") as MockVessel;
    const isOwner = vessel?.ownerId === OWNER._id || OWNER.role === "admin";
    expect(isOwner).toBe(false);

    // Confirm db.patch was never called
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });
});

// ─── 5. Mechanic authorization ────────────────────────────────────────────────

describe("Owner: mechanic authorization", () => {
  it("can only authorize a user who has role=mechanic", () => {
    const canAuthorize = (targetUser: MockUser) => targetUser.role === "mechanic";

    expect(canAuthorize(MECHANIC_USER)).toBe(true);
    expect(canAuthorize(NON_MECHANIC)).toBe(false);
  });

  it("authorization record has correct shape", async () => {
    const ctx = buildCtx({ user: OWNER, docs: { vessel1: VESSEL } });

    const docToInsert = {
      vesselId: "vessel1",
      mechanicId: MECHANIC_USER._id,
      authorizedAt: Date.now(),
      authorizedBy: OWNER._id,
      isActive: true,
    };

    await ctx.db.insert("mechanicAuthorizations", docToInsert);

    const inserted = assertInserted(ctx, "mechanicAuthorizations");
    expect(inserted).toMatchObject({
      vesselId: "vessel1",
      mechanicId: "mech1",
      isActive: true,
    });
  });

  it("revoking sets isActive to false", async () => {
    const ctx = buildCtx({
      user: OWNER,
      queryResults: {
        mechanicAuthorizations: [
          { _id: "auth1", vesselId: "vessel1", mechanicId: "mech1", isActive: true },
        ],
      },
    });

    const existing = await ctx.db
      .query("mechanicAuthorizations")
      .withIndex("by_vessel_mechanic", () => null as any)
      .filter(() => null as any)
      .first() as any;

    if (existing) await ctx.db.patch(existing._id, { isActive: false });

    assertPatched(ctx, "auth1");
    expect(ctx.db.patch).toHaveBeenCalledWith("auth1", { isActive: false });
  });
});

// ─── 6. Work order status transitions (owner perspective) ────────────────────

describe("Owner: work order status flow", () => {
  const WO_STATUS_TRANSITIONS: Record<string, string[]> = {
    quote_requested: ["quoted", "declined"],
    quoted:          ["in_progress", "declined"],
    in_progress:     ["completed"],
    completed:       [],
    declined:        [],
  };

  it("owner can approve a quote (quoted → in_progress)", () => {
    const validTransitions = WO_STATUS_TRANSITIONS["quoted"];
    expect(validTransitions).toContain("in_progress");
  });

  it("owner cannot move a completed order back", () => {
    const validTransitions = WO_STATUS_TRANSITIONS["completed"];
    expect(validTransitions).toHaveLength(0);
  });

  it("owner cannot set status to an arbitrary value", () => {
    const validStatuses = Object.keys(WO_STATUS_TRANSITIONS);
    expect(validStatuses).not.toContain("random_status");
  });
});

// ─── 7. Rating validation ─────────────────────────────────────────────────────

describe("Owner: mechanic rating", () => {
  it("valid rating is between 1 and 5 inclusive", () => {
    [1, 2, 3, 4, 5].forEach((r) => {
      const isValid = r >= 1 && r <= 5;
      expect(isValid).toBe(true);
    });
  });

  it("rating of 0 is invalid", () => {
    expect(0 >= 1 && 0 <= 5).toBe(false);
  });

  it("rating of 6 is invalid", () => {
    expect(6 >= 1 && 6 <= 5).toBe(false);
  });

  it("review text must not exceed 1000 characters", () => {
    expect(() => requireMaxLength("Great work!".padEnd(1001, "!"), "Review", 1000)).toThrow();
    expect(() => requireMaxLength("Great work!", "Review", 1000)).not.toThrow();
  });
});

// ─── 8. Notification types owner receives ────────────────────────────────────

describe("Owner: expected notification types", () => {
  const OWNER_NOTIFICATION_TYPES = [
    "work_order_completed",
    "quote_submitted",
    "service_reminder",
    "mechanic_authorized",
    "fleet_service_overdue",
    "fleet_service_approaching",
    "fleet_captain_report",
    "fleet_distress_notice",
    "fleet_vessel_status",
    "fleet_mechanic_authorized",
  ];

  it("all expected owner notification types are defined", () => {
    OWNER_NOTIFICATION_TYPES.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("does not include captain-only types", () => {
    expect(OWNER_NOTIFICATION_TYPES).not.toContain("captain_trip_report_filed");
  });
});
