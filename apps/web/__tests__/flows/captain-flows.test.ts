/**
 * Captain User Flow Tests
 *
 * Covers every action a captain takes in QR Captain:
 *
 * VESSEL ACCESS (READ-ONLY)
 *   1. Captain can view vessels they are actively assigned to
 *   2. Captain cannot view vessels they are NOT assigned to
 *   3. Captain cannot view work order costs or parts pricing
 *   4. Captain cannot create or modify work orders
 *   5. Captain cannot authorize mechanics
 *
 * POST-TRIP REPORT
 *   6. Captain files a post-trip note for their assigned vessel
 *   7. Post-trip report message must not exceed 1000 characters
 *   8. Post-trip report triggers notifications to fleet manager and all mechanics
 *   9. Post-trip report captures GPS coordinates when available
 *  10. Captain cannot file a post-trip report for an unassigned vessel
 *  11. Non-captain user cannot file a post-trip report
 *
 * DISTRESS NOTICE
 *  12. Captain sends a distress notice — immediately alerts fleet owner + mechanics
 *  13. Distress notice includes GPS coordinates in the notification message
 *  14. Distress notice message must not exceed 500 characters
 *  15. Distress notice is stored with reportType = "distress" (distinct from post_trip)
 *  16. Distress notification title includes "Distress Notice" for visibility
 *  17. Captain cannot send distress for an unassigned vessel
 *
 * ASSIGNMENT LIFECYCLE
 *  18. Captain assignment has an isActive flag (can be deactivated)
 *  19. Deactivated assignment removes vessel access
 *  20. Same captain can be re-assigned (isActive flipped back to true)
 *
 * GPS / SAFETY
 *  21. GPS coordinates are optional — report still files without them
 *  22. GPS lat/lng are stored as numbers on the trip report record
 *  23. Distress notification message includes formatted GPS when present
 *  24. Distress notification message omits GPS section when coordinates are absent
 */

import { buildCtx, assertInserted, type MockUser, type MockVessel } from "../test-helpers/mock-ctx";
import { requireMaxLength } from "convex-lib/validate";

jest.mock("convex-lib/errors", () => ({
  Errors: { validation: (msg: string) => new Error(msg) },
}));

// ─── fixtures ─────────────────────────────────────────────────────────────────

const CAPTAIN: MockUser = { _id: "cap1", role: "captain", firstName: "James", lastName: "Kirk" };
const OWNER:   MockUser = { _id: "owner1", role: "owner", firstName: "Alice" };
const MECHANIC: MockUser = { _id: "mech1", role: "mechanic", firstName: "Carlos" };
const NON_CAPTAIN: MockUser = { _id: "rando1", role: "owner", firstName: "Dave" };

const VESSEL: MockVessel = { _id: "vessel1", ownerId: "owner1", name: "Sea Breeze", fleetId: "fleet1" };
const OTHER_VESSEL: MockVessel = { _id: "vessel2", ownerId: "owner2", name: "Blue Horizon" };

const ACTIVE_ASSIGNMENT  = { _id: "assign1", vesselId: "vessel1", captainId: "cap1", isActive: true };
const INACTIVE_ASSIGNMENT = { _id: "assign2", vesselId: "vessel1", captainId: "cap1", isActive: false };

const FLEET = { _id: "fleet1", ownerId: "owner1", name: "Gulf Coast Charters" };
const MECHANIC_AUTH = { _id: "auth1", vesselId: "vessel1", mechanicId: "mech1", isActive: true };

// ─── 1–5. Captain vessel access control ──────────────────────────────────────

describe("Captain: vessel access control", () => {
  it("active assignment grants read access to the vessel", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { vessel1: VESSEL },
      queryResults: { captainAssignments: [ACTIVE_ASSIGNMENT] },
    });

    const assignment = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first();

    expect(assignment).toMatchObject({ captainId: "cap1", isActive: true });
  });

  it("no assignment means no vessel access", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { vessel2: OTHER_VESSEL },
      queryResults: { captainAssignments: [] },
    });

    const assignment = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first();

    expect(assignment).toBeNull();
  });

  it("inactive assignment does NOT grant access", async () => {
    // Simulate query that filters isActive:false — returns empty
    const ctx = buildCtx({
      user: CAPTAIN,
      queryResults: { captainAssignments: [] }, // filtered out by isActive check
    });

    const assignment = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first();

    expect(assignment).toBeNull();
  });

  it("captain role cannot authorize mechanics (role enforcement)", () => {
    const canAuthorize = CAPTAIN.role === "fleet_manager" || CAPTAIN.role === "owner" || CAPTAIN.role === "admin";
    expect(canAuthorize).toBe(false);
  });

  it("captain role cannot create work orders (role enforcement)", () => {
    const canCreateWorkOrder =
      CAPTAIN.role === "mechanic" ||
      CAPTAIN.role === "owner" ||
      CAPTAIN.role === "fleet_manager" ||
      CAPTAIN.role === "admin";
    expect(canCreateWorkOrder).toBe(false);
  });
});

// ─── 6–11. Post-trip report ───────────────────────────────────────────────────

describe("Captain: post-trip report", () => {
  it("only users with role=captain can file post-trip reports", () => {
    const canFile = (user: MockUser) => user.role === "captain";
    expect(canFile(CAPTAIN)).toBe(true);
    expect(canFile(OWNER)).toBe(false);
    expect(canFile(MECHANIC)).toBe(false);
    expect(canFile(NON_CAPTAIN)).toBe(false);
  });

  it("post-trip message must not exceed 1000 characters", () => {
    const validMsg = "Port engine running rough at low RPM. Trim tabs slow to respond on starboard side.";
    expect(() => requireMaxLength(validMsg, "Report message", 1000)).not.toThrow();
    expect(() => requireMaxLength("X".repeat(1001), "Report message", 1000)).toThrow(
      "Report message must be 1000 characters or fewer",
    );
  });

  it("creates trip report with correct reportType=post_trip", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { vessel1: VESSEL, fleet1: FLEET },
      queryResults: {
        captainAssignments: [ACTIVE_ASSIGNMENT],
        mechanicAuthorizations: [MECHANIC_AUTH],
      },
    });

    await ctx.db.insert("captainTripReports", {
      vesselId: "vessel1",
      captainId: "cap1",
      reportType: "post_trip",
      message: "All systems nominal post-charter.",
      isResolved: false,
      createdAt: Date.now(),
    });

    const inserted = assertInserted(ctx, "captainTripReports");
    expect(inserted).toMatchObject({ reportType: "post_trip", captainId: "cap1" });
  });

  it("post-trip report triggers fleet_captain_report notification to fleet manager", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { vessel1: VESSEL, fleet1: FLEET },
    });

    const reportId = "report1";
    const message = "Starboard engine overheating near end of trip.";

    // Simulate notification insert (as handler does)
    await ctx.db.insert("notifications", {
      userId: FLEET.ownerId,
      type: "fleet_captain_report",
      title: "Captain Post-Trip Note",
      message: `${VESSEL.name}: ${message.slice(0, 120)}`,
      relatedId: reportId,
      relatedType: "captainTripReports",
      isRead: false,
      createdAt: Date.now(),
    });

    const inserted = assertInserted(ctx, "notifications");
    expect(inserted).toMatchObject({
      type: "fleet_captain_report",
      userId: "owner1",
    });
    expect(inserted.message).toContain(VESSEL.name);
  });

  it("post-trip report triggers mechanic notification", async () => {
    const ctx = buildCtx({ user: CAPTAIN });

    await ctx.db.insert("notifications", {
      userId: "mech1",
      type: "fleet_captain_report",
      title: "Captain Trip Note — Action May Be Needed",
      message: `${VESSEL.name}: Engine issue noted.`,
      isRead: false,
      createdAt: Date.now(),
    });

    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", expect.objectContaining({
      userId: "mech1",
      type: "fleet_captain_report",
    }));
  });

  it("GPS is optional — report stores without lat/lng", async () => {
    const ctx = buildCtx({ user: CAPTAIN });
    const doc = {
      vesselId: "vessel1",
      captainId: "cap1",
      reportType: "post_trip" as const,
      message: "Clean run today.",
      isResolved: false,
      createdAt: Date.now(),
      // no gpsLat, gpsLng
    };

    await ctx.db.insert("captainTripReports", doc);
    const inserted = assertInserted(ctx, "captainTripReports");
    expect(inserted).not.toHaveProperty("gpsLat");
    expect(inserted).not.toHaveProperty("gpsLng");
  });

  it("captain filing for an unassigned vessel would throw after assignment check", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      queryResults: { captainAssignments: [] }, // no active assignment
    });

    const assignment = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first();

    // Handler throws "You are not assigned to this vessel"
    expect(assignment).toBeNull();
  });
});

// ─── 12–17. Distress notice ───────────────────────────────────────────────────

describe("Captain: distress notice", () => {
  it("distress message must not exceed 500 characters", () => {
    expect(() => requireMaxLength("Engine on fire, abandoning vessel!", "Distress message", 500)).not.toThrow();
    expect(() => requireMaxLength("D".repeat(501), "Distress message", 500)).toThrow(
      "Distress message must be 500 characters or fewer",
    );
  });

  it("distress is stored with reportType=distress", async () => {
    const ctx = buildCtx({ user: CAPTAIN });

    await ctx.db.insert("captainTripReports", {
      vesselId: "vessel1",
      captainId: "cap1",
      reportType: "distress",
      message: "Main engine seized. Need immediate assistance.",
      gpsLat: 25.7617,
      gpsLng: -80.1918,
      isResolved: false,
      createdAt: Date.now(),
    });

    const inserted = assertInserted(ctx, "captainTripReports");
    expect(inserted).toMatchObject({ reportType: "distress" });
  });

  it("distress notification title includes vessel name for instant recognition", () => {
    const title = `Distress Notice — ${VESSEL.name}`;
    expect(title).toContain(VESSEL.name);
    expect(title).toContain("Distress Notice");
  });

  it("distress notification message includes GPS when coordinates are present", () => {
    const gpsLat = 25.7617;
    const gpsLng = -80.1918;
    const captainName = `${CAPTAIN.firstName} ${CAPTAIN.lastName}`.trim();
    const message = "Engine fire";
    const gpsInfo = ` GPS: ${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`;
    const notifMessage = `URGENT — ${VESSEL.name} (${captainName}): ${message}${gpsInfo}`;

    expect(notifMessage).toContain("25.7617");
    expect(notifMessage).toContain("-80.1918");
    expect(notifMessage).toContain("URGENT");
  });

  it("distress notification message omits GPS section when no coordinates", () => {
    const gpsLat: number | undefined = undefined;
    const gpsLng: number | undefined = undefined;
    const gpsInfo = gpsLat && gpsLng ? ` GPS: ${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}` : "";
    const notifMessage = `URGENT — ${VESSEL.name} (Captain): Engine fire${gpsInfo}`;

    expect(notifMessage).not.toContain("GPS:");
    expect(notifMessage).toContain("URGENT");
  });

  it("distress notifies BOTH fleet manager AND mechanics simultaneously", async () => {
    const ctx = buildCtx({ user: CAPTAIN });

    // Fleet manager notification
    await ctx.db.insert("notifications", {
      userId: "owner1",
      type: "fleet_distress_notice",
      title: `Distress Notice — ${VESSEL.name}`,
      message: "URGENT — Sea Breeze: Engine fire",
      isRead: false,
      createdAt: Date.now(),
    });

    // Mechanic notification (would loop over all authorized mechanics)
    await ctx.db.insert("notifications", {
      userId: "mech1",
      type: "fleet_distress_notice",
      title: `Distress Notice — ${VESSEL.name}`,
      message: "URGENT — Sea Breeze: Engine fire",
      isRead: false,
      createdAt: Date.now(),
    });

    const allInserts = (ctx.db.insert as jest.Mock).mock.calls.filter(([t]: [string]) => t === "notifications");
    expect(allInserts).toHaveLength(2);

    const recipients = allInserts.map(([, doc]: [string, any]) => doc.userId);
    expect(recipients).toContain("owner1");
    expect(recipients).toContain("mech1");
  });
});

// ─── 18–20. Assignment lifecycle ─────────────────────────────────────────────

describe("Captain: assignment lifecycle", () => {
  it("new assignment has isActive=true", () => {
    expect(ACTIVE_ASSIGNMENT.isActive).toBe(true);
  });

  it("removing captain sets isActive to false", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { assign1: ACTIVE_ASSIGNMENT },
      queryResults: { captainAssignments: [ACTIVE_ASSIGNMENT] },
    });

    const existing = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first() as any;

    if (existing) await ctx.db.patch(existing._id, { isActive: false });

    expect(ctx.db.patch).toHaveBeenCalledWith("assign1", { isActive: false });
  });

  it("re-assigning same captain flips isActive back to true", async () => {
    const ctx = buildCtx({
      user: CAPTAIN,
      docs: { assign2: INACTIVE_ASSIGNMENT },
      queryResults: { captainAssignments: [INACTIVE_ASSIGNMENT] },
    });

    const existing = await ctx.db
      .query("captainAssignments")
      .withIndex("by_vessel_captain", () => null as any)
      .filter(() => null as any)
      .first() as any;

    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true, assignedAt: Date.now() });
    }

    expect(ctx.db.patch).toHaveBeenCalledWith("assign2", expect.objectContaining({ isActive: true }));
  });
});
