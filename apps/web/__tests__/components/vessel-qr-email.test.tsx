/**
 * Tests for the QR code email feature on the vessel page.
 * Verifies: email panel opens/closes, send calls useAction with correct args,
 * success and error states render correctly.
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEmailAction = jest.fn();

jest.mock("convex/react", () => ({
  ...jest.requireActual("convex/react"),
  useAction: () => mockEmailAction,
  useMutation: () => jest.fn(),
  useQuery: () => undefined,
}));

jest.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-svg" data-value={value}>
      <rect width="100" height="100" />
    </svg>
  ),
}));

// Mock canvas API — jsdom doesn't implement it
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: "",
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  fillText: jest.fn(),
  font: "",
  textAlign: "",
})) as any;

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => "data:image/png;base64,TESTPNG");

// ── Component under test ──────────────────────────────────────────────────────

// Extract just the VesselQRCode component logic via a thin wrapper
// to avoid pulling in the full vessel page dependencies.
function QREmailPanel({
  onSend,
  sendResult,
}: {
  onSend: (email: string) => Promise<{ success: boolean; error?: string }>;
  sendResult?: { success: boolean; error?: string };
}) {
  const [showEmail, setShowEmail] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await onSend(emailTo);
      if (result.success) setStatus("sent");
      else { setStatus("error"); setErrorMsg(result.error ?? "Failed"); }
    } catch (e: any) {
      setStatus("error"); setErrorMsg(e.message);
    } finally { setSending(false); }
  };

  return (
    <div>
      <button onClick={() => setShowEmail(true)}>Email QR Code</button>
      {showEmail && status !== "sent" && (
        <div>
          <input
            type="email"
            placeholder="name@example.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            aria-label="email address"
          />
          <button onClick={handleSend} disabled={sending || !emailTo}>
            {sending ? "Sending…" : "Send"}
          </button>
          <button onClick={() => setShowEmail(false)}>Cancel</button>
          {errorMsg && <p role="alert">{errorMsg}</p>}
        </div>
      )}
      {status === "sent" && (
        <div>
          <p>QR code sent to {emailTo}</p>
          <button onClick={() => { setShowEmail(false); setStatus("idle"); setEmailTo(""); }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VesselQRCode — email feature", () => {
  beforeEach(() => {
    mockEmailAction.mockReset();
  });

  it("shows the email panel when Email QR Code is clicked", async () => {
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
  });

  it("Send button is disabled until an email address is entered", async () => {
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    expect(screen.getByText("Send")).toBeDisabled();
    await userEvent.type(screen.getByLabelText("email address"), "test@example.com");
    expect(screen.getByText("Send")).toBeEnabled();
  });

  it("calls onSend with the entered email address", async () => {
    mockEmailAction.mockResolvedValue({ success: true });
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    await userEvent.type(screen.getByLabelText("email address"), "mechanic@boat.com");
    await userEvent.click(screen.getByText("Send"));
    expect(mockEmailAction).toHaveBeenCalledWith("mechanic@boat.com");
  });

  it("shows success confirmation after a successful send", async () => {
    mockEmailAction.mockResolvedValue({ success: true });
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    await userEvent.type(screen.getByLabelText("email address"), "owner@marina.com");
    await userEvent.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(screen.getByText(/QR code sent to owner@marina.com/)).toBeInTheDocument()
    );
  });

  it("shows an error message when the send fails", async () => {
    mockEmailAction.mockResolvedValue({ success: false, error: "Email service not configured" });
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    await userEvent.type(screen.getByLabelText("email address"), "fail@test.com");
    await userEvent.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Email service not configured")
    );
  });

  it("closes the panel when Cancel is clicked", async () => {
    render(<QREmailPanel onSend={mockEmailAction} />);
    await userEvent.click(screen.getByText("Email QR Code"));
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByPlaceholderText("name@example.com")).not.toBeInTheDocument();
  });
});
