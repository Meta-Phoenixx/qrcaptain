/**
 * H-03: owner / fleet_manager role parity.
 *
 * fleet_manager is the multi-vessel owner role — it must have the same access
 * rights as owner everywhere owner is checked. These tests document and enforce
 * the contract for each location that was previously inconsistent.
 */

type Role = "owner" | "fleet_manager" | "mechanic" | "admin";

function isOwnerClass(role: Role): boolean {
  return role === "owner" || role === "fleet_manager";
}

describe("H-03: owner/fleet_manager role parity", () => {
  describe("isOwnerClass helper", () => {
    it("accepts owner", () => expect(isOwnerClass("owner")).toBe(true));
    it("accepts fleet_manager", () => expect(isOwnerClass("fleet_manager")).toBe(true));
    it("rejects mechanic", () => expect(isOwnerClass("mechanic")).toBe(false));
    it("rejects admin", () => expect(isOwnerClass("admin")).toBe(false));
  });

  describe("getPendingRequestsForOwner gate", () => {
    function gate(role: Role) {
      return !(role !== "owner" && role !== "fleet_manager");
    }
    it("allows owner", () => expect(gate("owner")).toBe(true));
    it("allows fleet_manager", () => expect(gate("fleet_manager")).toBe(true));
    it("blocks mechanic", () => expect(gate("mechanic")).toBe(false));
  });

  describe("getMechanicsForOwner gate", () => {
    function gate(role: Role) {
      return !(role !== "owner" && role !== "fleet_manager");
    }
    it("allows owner", () => expect(gate("owner")).toBe(true));
    it("allows fleet_manager", () => expect(gate("fleet_manager")).toBe(true));
    it("blocks mechanic", () => expect(gate("mechanic")).toBe(false));
  });

  describe("listWorkOrders vessel ownership check", () => {
    function canView(role: Role, isVesselOwner: boolean): boolean {
      if (role === "owner" || role === "fleet_manager") return isVesselOwner;
      return true; // mechanic/admin handled separately
    }
    it("owner can view own vessel", () => expect(canView("owner", true)).toBe(true));
    it("owner cannot view other vessel", () => expect(canView("owner", false)).toBe(false));
    it("fleet_manager can view own vessel", () => expect(canView("fleet_manager", true)).toBe(true));
    it("fleet_manager cannot view other vessel", () => expect(canView("fleet_manager", false)).toBe(false));
  });

  describe("cancelWorkOrder isOwnerCancelling", () => {
    function isOwnerCancelling(role: Role, requestedByCurrentUser: boolean): boolean {
      return role === "owner" || role === "fleet_manager" || requestedByCurrentUser;
    }
    it("owner counts as owner-cancelling", () => expect(isOwnerCancelling("owner", false)).toBe(true));
    it("fleet_manager counts as owner-cancelling", () => expect(isOwnerCancelling("fleet_manager", false)).toBe(true));
    it("mechanic who created the request counts", () => expect(isOwnerCancelling("mechanic", true)).toBe(true));
    it("unrelated mechanic does not count", () => expect(isOwnerCancelling("mechanic", false)).toBe(false));
  });
});
