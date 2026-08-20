/**
 * WorkOrderRequestForm tests
 *
 * KEY REGRESSION: the Convex useQuery "skip" sentinel must be passed as the
 * ARGS argument, never as the QUERY FUNCTION reference.
 *
 *   ✅ correct:  useQuery(api.fn, condition ? {} : "skip")
 *   ❌ wrong:    useQuery(condition ? "skip" : api.fn)
 *
 * Passing "skip" as the function causes Convex to resolve it as a module path
 * ("skip:default") and throw [CONVEX Q(skip:default)] Server Error, which
 * crashes the page-level React error boundary.
 *
 * These tests verify:
 *   1. Form renders without crashing for fleet_manager role
 *   2. Form renders without crashing for owner role
 *   3. fleet_manager sees vessel list (not empty)
 *   4. fleet_manager sees fleet mechanics, not preferredMechanics
 *   5. owner sees preferredMechanics, not fleet mechanics
 *   6. Mechanic can't see the form (button hidden — guard tested separately)
 *   7. Validation: vessel required before submit
 *   8. Validation: mechanic required before submit
 *   9. Validation: description required before submit
 *  10. Successful submit calls requestWorkOrder with correct args
 *  11. Submit error is shown inline, does not crash page
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "../test-utils";

// ─── Convex mock ──────────────────────────────────────────────────────────────
// We intercept useQuery and useMutation so no real Convex connection is needed.

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();

jest.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// The component imports api via relative path — mock using the resolved path.
jest.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: { currentUser: "users:currentUser" },
    vessels: { listMyVessels: "vessels:listMyVessels" },
    vesselEquipment: { listByVessel: "vesselEquipment:listByVessel" },
    workOrders: { requestWorkOrder: "workOrders:requestWorkOrder" },
    preferredMechanics: { getPreferredMechanics: "preferredMechanics:getPreferredMechanics" },
    fleets: {
      listMyFleets: "fleets:listMyFleets",
      getFleet: "fleets:getFleet",
    },
  },
}));

import { WorkOrderRequestForm } from "../../components/work-order-request-form";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VESSEL = { _id: "vessel1", name: "Sea Breeze", year: 2020, make: "Sea Ray", model: "SLX 280", fleetId: "fleet1" };
const FLEET  = { _id: "fleet1", name: "Gulf Coast Charters" };
const MECH   = { _id: "mech1", firstName: "Joe", lastName: "Fix", companyName: "Fix Marine" };

const FLEET_DETAIL = { ...FLEET, mechanics: [MECH] };

const PREFERRED_MECH = {
  mechanicId: "mech2",
  firstName: "Bob",
  lastName: "Wrench",
  companyName: "Bob's Marine",
  avgOverallRating: 4.5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupMocks({
  role = "fleet_manager",
  vessels = [VESSEL],
  fleets = [FLEET],
  fleetDetail = FLEET_DETAIL,
  preferredMechanics = [] as typeof PREFERRED_MECH[],
  requestWorkOrder = jest.fn().mockResolvedValue({ workOrderId: "wo1" }),
} = {}) {
  const user = { _id: "user1", role };

  mockUseQuery.mockImplementation((fn: string, args?: unknown) => {
    // REGRESSION GUARD: "skip" must never appear as the fn argument.
    // If it does, that's the bug we fixed — catch it here.
    if (fn === "skip") {
      throw new Error(
        `[TEST REGRESSION] useQuery received "skip" as the query function. ` +
        `"skip" must be passed as the args argument: useQuery(fn, "skip"), not useQuery("skip").`
      );
    }

    if (fn === "users:currentUser")                              return user;
    if (fn === "vessels:listMyVessels")                         return vessels;
    if (fn === "fleets:listMyFleets")   {
      // Should only be called for fleet_manager (args = {}) not skipped
      if (args === "skip") return undefined;
      return fleets;
    }
    if (fn === "fleets:getFleet") {
      if (args === "skip" || !(args as any)?.fleetId) return undefined;
      return fleetDetail;
    }
    if (fn === "preferredMechanics:getPreferredMechanics") {
      if (args === "skip") return undefined;
      return preferredMechanics;
    }
    if (fn === "vesselEquipment:listByVessel") return [];
    return undefined;
  });

  mockUseMutation.mockImplementation((fn: string) => {
    if (fn === "workOrders:requestWorkOrder") return requestWorkOrder;
    return jest.fn();
  });

  return { requestWorkOrder };
}

// ─── 1. Renders without crashing — fleet_manager ─────────────────────────────

describe("WorkOrderRequestForm — fleet_manager", () => {
  beforeEach(() => setupMocks({ role: "fleet_manager" }));
  afterEach(() => jest.clearAllMocks());

  it("renders without crashing (no skip:default error)", () => {
    // If the skip sentinel is in the wrong position, mockUseQuery throws and
    // this test fails with the regression message.
    expect(() =>
      render(<WorkOrderRequestForm onCancel={jest.fn()} />)
    ).not.toThrow();
  });

  it("shows the form title", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    expect(screen.getByText(/request work order/i)).toBeInTheDocument();
  });

  it("shows vessel dropdown with fleet vessels", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    expect(screen.getByText(/sea breeze/i)).toBeInTheDocument();
  });

  it("shows fleet mechanics in the mechanic dropdown", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    expect(screen.getByText(/fix marine/i)).toBeInTheDocument();
  });

  it("does NOT call preferredMechanics query (passes skip as args)", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const preferredCall = mockUseQuery.mock.calls.find(
      ([fn]: [string]) => fn === "preferredMechanics:getPreferredMechanics"
    );
    expect(preferredCall).toBeDefined();
    // args must be "skip", not called with no args or {}
    expect(preferredCall![1]).toBe("skip");
  });

  it("calls listMyFleets with {} args (not skipped)", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const fleetCall = mockUseQuery.mock.calls.find(
      ([fn]: [string]) => fn === "fleets:listMyFleets"
    );
    expect(fleetCall).toBeDefined();
    expect(fleetCall![1]).not.toBe("skip");
  });
});

// ─── 2. Renders without crashing — owner ─────────────────────────────────────

describe("WorkOrderRequestForm — owner", () => {
  beforeEach(() =>
    setupMocks({
      role: "owner",
      preferredMechanics: [PREFERRED_MECH],
    })
  );
  afterEach(() => jest.clearAllMocks());

  it("renders without crashing", () => {
    expect(() =>
      render(<WorkOrderRequestForm onCancel={jest.fn()} />)
    ).not.toThrow();
  });

  it("shows preferred mechanics for owner", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    expect(screen.getByText(/bob's marine/i)).toBeInTheDocument();
  });

  it("skips listMyFleets for owner (passes skip as args)", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const fleetCall = mockUseQuery.mock.calls.find(
      ([fn]: [string]) => fn === "fleets:listMyFleets"
    );
    expect(fleetCall).toBeDefined();
    expect(fleetCall![1]).toBe("skip");
  });

  it("does NOT skip preferredMechanics for owner", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const prefCall = mockUseQuery.mock.calls.find(
      ([fn]: [string]) => fn === "preferredMechanics:getPreferredMechanics"
    );
    expect(prefCall).toBeDefined();
    expect(prefCall![1]).not.toBe("skip");
  });
});

// ─── 3–5. Form validation ─────────────────────────────────────────────────────
// The submit button is disabled until all required fields are filled.
// These tests verify the disabled guard at each step.

describe("WorkOrderRequestForm — validation", () => {
  beforeEach(() => setupMocks({ role: "fleet_manager" }));
  afterEach(() => jest.clearAllMocks());

  it("submit button is disabled when no vessel selected", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    expect(screen.getByRole("button", { name: /request quote/i })).toBeDisabled();
  });

  it("submit button is still disabled after vessel selected but no mechanic", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "vessel1" } });
    expect(screen.getByRole("button", { name: /request quote/i })).toBeDisabled();
  });

  it("submit button is still disabled after vessel + mechanic but no description", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "vessel1" } }); // vessel
    fireEvent.change(selects[1], { target: { value: "mech1" } });   // mechanic
    expect(screen.getByRole("button", { name: /request quote/i })).toBeDisabled();
  });

  it("submit button becomes enabled once all required fields are filled", () => {
    render(<WorkOrderRequestForm onCancel={jest.fn()} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "vessel1" } });
    fireEvent.change(selects[1], { target: { value: "mech1" } });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: "Oil change needed" },
    });
    expect(screen.getByRole("button", { name: /request quote/i })).not.toBeDisabled();
  });
});

// ─── 6. Successful submit ─────────────────────────────────────────────────────

describe("WorkOrderRequestForm — successful submit", () => {
  it("calls requestWorkOrder with correct args and closes form", async () => {
    const requestWorkOrder = jest.fn().mockResolvedValue({ workOrderId: "wo1" });
    const onCancel = jest.fn();
    setupMocks({ role: "fleet_manager", requestWorkOrder });

    render(<WorkOrderRequestForm onCancel={onCancel} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "vessel1" } }); // vessel
    fireEvent.change(selects[1], { target: { value: "mech1" } });   // mechanic

    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: "Engine oil change needed" },
    });

    fireEvent.click(screen.getByRole("button", { name: /request quote/i }));

    await waitFor(() => {
      expect(requestWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          vesselId: "vessel1",
          mechanicId: "mech1",
          description: "Engine oil change needed",
        })
      );
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it("shows inline error on submit failure — does not crash page", async () => {
    const requestWorkOrder = jest.fn().mockRejectedValue(new Error("Access denied"));
    const onCancel = jest.fn();
    setupMocks({ role: "fleet_manager", requestWorkOrder });

    render(<WorkOrderRequestForm onCancel={onCancel} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "vessel1" } }); // vessel
    fireEvent.change(selects[1], { target: { value: "mech1" } });   // mechanic

    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: "Fix the engine" },
    });

    fireEvent.click(screen.getByRole("button", { name: /request quote/i }));

    await waitFor(() => {
      // Error shown inline — page not crashed, onCancel NOT called
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});

// ─── 7. Pre-selected vessel hides vessel picker ───────────────────────────────

describe("WorkOrderRequestForm — preSelectedVesselId", () => {
  it("hides vessel selector when vessel is pre-selected", () => {
    setupMocks({ role: "fleet_manager" });
    render(
      <WorkOrderRequestForm
        onCancel={jest.fn()}
        preSelectedVesselId={"vessel1" as any}
      />
    );
    // With preSelectedVesselId set, the vessel combobox should not render.
    // The mechanic combobox may still exist, so check the count.
    const selects = screen.queryAllByRole("combobox");
    // Only mechanic (and possibly equipment) selects remain — vessel select is gone
    const vesselOptionPresent = selects.some((s) =>
      Array.from(s.querySelectorAll("option")).some((o) =>
        (o as HTMLOptionElement).text.includes("Sea Breeze")
      )
    );
    expect(vesselOptionPresent).toBe(false);
  });
});
