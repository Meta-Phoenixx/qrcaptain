import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock next/navigation ─────────────────────────────────────────────────────
const mockBack = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, refresh: mockRefresh }),
}));

// ── Mock AppSideNav ───────────────────────────────────────────────────────────
jest.mock("@/components/app-side-nav", () => ({
  AppSideNav: () => <nav data-testid="side-nav" />,
}));

// ── Component under test ──────────────────────────────────────────────────────
import TabsError from "@/app/(tabs)/error";

function makeError(message: string, name = "Error"): Error & { digest?: string } {
  const e = new Error(message);
  e.name = name;
  return e;
}

describe("TabsError — error boundary", () => {
  it("renders a human-readable title for a network error", () => {
    render(<TabsError error={makeError("Failed to fetch")} reset={jest.fn()} />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText(/couldn't reach the QR Captain servers/i)).toBeInTheDocument();
  });

  it("renders a human-readable title for an access denied error", () => {
    render(<TabsError error={makeError("Access denied: unauthorized")} reset={jest.fn()} />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("renders a human-readable title for a not found error", () => {
    render(<TabsError error={makeError("Record not found")} reset={jest.fn()} />);
    expect(screen.getByText("Resource not found")).toBeInTheDocument();
  });

  it("falls back to 'Unexpected error' for unknown errors", () => {
    render(<TabsError error={makeError("Something totally unknown happened")} reset={jest.fn()} />);
    expect(screen.getByText("Unexpected error")).toBeInTheDocument();
    // The message appears in the explanation card (not just the debug section)
    const alerts = screen.getAllByText(/Something totally unknown happened/);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("calls router.refresh() and reset() when Try Again is clicked", () => {
    const reset = jest.fn();
    render(<TabsError error={makeError("boom")} reset={reset} />);
    fireEvent.click(screen.getByText("Try Again"));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("calls router.back() when Go Back is clicked", () => {
    render(<TabsError error={makeError("boom")} reset={jest.fn()} />);
    fireEvent.click(screen.getByText("Go Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("shows error details in a collapsed section", () => {
    render(<TabsError error={makeError("internal details")} reset={jest.fn()} />);
    expect(screen.getByText("Error details (for developers)")).toBeInTheDocument();
  });
});
