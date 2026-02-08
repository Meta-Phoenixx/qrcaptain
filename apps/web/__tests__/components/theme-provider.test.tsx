import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../../components/providers/theme-provider";

// Test component that consumes the theme context
function ThemeConsumer() {
  const { mode, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("provides dark mode by default", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("toggles from dark to light mode", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("mode").textContent).toBe("dark");

    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("toggles back to dark mode on second toggle", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Toggle")); // dark -> light
    fireEvent.click(screen.getByText("Toggle")); // light -> dark
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });
});

describe("useTheme outside provider", () => {
  it("returns default values when used outside ThemeProvider", () => {
    // useTheme has defaults: mode "dark", toggleTheme is a no-op
    render(<ThemeConsumer />);
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    // toggleTheme is a no-op, so clicking should not throw
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });
});
