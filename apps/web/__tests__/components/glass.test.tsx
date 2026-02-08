import React from "react";
import { render, screen, fireEvent } from "../test-utils";
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassSelect,
  GlassBadge,
  GlassModal,
} from "../../components/ui/glass";

describe("GlassCard", () => {
  it("renders children correctly", () => {
    render(<GlassCard>Card Content</GlassCard>);
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<GlassCard className="p-8">Content</GlassCard>);
    const card = screen.getByText("Content").closest("div");
    expect(card?.className).toContain("p-8");
  });

  it("applies interactive styles when interactive prop is true", () => {
    render(<GlassCard interactive>Clickable</GlassCard>);
    const card = screen.getByText("Clickable").closest("div");
    expect(card?.className).toContain("cursor-pointer");
  });

  it("handles click events", () => {
    const handleClick = jest.fn();
    render(<GlassCard onClick={handleClick}>Clickable</GlassCard>);
    fireEvent.click(screen.getByText("Clickable"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("GlassButton", () => {
  it("renders children correctly", () => {
    render(<GlassButton>Click Me</GlassButton>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<GlassButton onClick={handleClick}>Click</GlassButton>);
    fireEvent.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<GlassButton disabled>Disabled</GlassButton>);
    expect(screen.getByText("Disabled").closest("button")).toBeDisabled();
  });

  it("renders with primary variant by default", () => {
    render(<GlassButton>Primary</GlassButton>);
    const button = screen.getByText("Primary").closest("button");
    expect(button?.className).toContain("bg-gradient-to-b");
  });

  it("renders with secondary variant", () => {
    render(<GlassButton variant="secondary">Secondary</GlassButton>);
    const button = screen.getByText("Secondary").closest("button");
    expect(button).toBeTruthy();
  });

  it("renders with ghost variant", () => {
    render(<GlassButton variant="ghost">Ghost</GlassButton>);
    const button = screen.getByText("Ghost").closest("button");
    expect(button?.className).toContain("bg-transparent");
  });
});

describe("GlassInput", () => {
  it("renders with correct type", () => {
    render(<GlassInput type="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText("Email");
    expect(input).toHaveAttribute("type", "email");
  });

  it("accepts user input", () => {
    render(<GlassInput placeholder="Type here" />);
    const input = screen.getByPlaceholderText("Type here") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");
  });

  it("applies custom className", () => {
    render(<GlassInput className="mt-4" placeholder="Test" />);
    const input = screen.getByPlaceholderText("Test");
    expect(input.className).toContain("mt-4");
  });
});

describe("GlassSelect", () => {
  it("renders options correctly", () => {
    render(
      <GlassSelect data-testid="select">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </GlassSelect>
    );
    const select = screen.getByTestId("select") as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.options[0].text).toBe("Option A");
  });

  it("handles value changes", () => {
    const handleChange = jest.fn();
    render(
      <GlassSelect data-testid="select" onChange={handleChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </GlassSelect>
    );
    fireEvent.change(screen.getByTestId("select"), {
      target: { value: "b" },
    });
    expect(handleChange).toHaveBeenCalled();
  });
});

describe("GlassBadge", () => {
  it("renders children", () => {
    render(<GlassBadge>Active</GlassBadge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies color variants", () => {
    const { rerender } = render(<GlassBadge color="green">OK</GlassBadge>);
    expect(screen.getByText("OK")).toBeInTheDocument();

    rerender(<GlassBadge color="red">Error</GlassBadge>);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });
});

describe("GlassModal", () => {
  it("renders modal content", () => {
    const handleClose = jest.fn();
    render(<GlassModal onClose={handleClose}>Modal Body</GlassModal>);
    expect(screen.getByText("Modal Body")).toBeInTheDocument();
  });

  it("closes on Escape key press", () => {
    const handleClose = jest.fn();
    render(<GlassModal onClose={handleClose}>Content</GlassModal>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("closes when backdrop is clicked", () => {
    const handleClose = jest.fn();
    const { container } = render(
      <GlassModal onClose={handleClose}>Content</GlassModal>
    );
    // Click the backdrop (first child div with bg-black/60)
    const backdrop = container.querySelector(".backdrop-blur-sm");
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
