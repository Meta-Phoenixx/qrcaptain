import React, { ReactElement } from "react";
import "@testing-library/jest-dom";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider, ThemeMode } from "../components/providers/theme-provider";

// Wrapper that provides ThemeProvider for components that use useTheme
function AllProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// Custom render that includes all providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render with our custom wrapper
export { customRender as render };
