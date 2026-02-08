import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - sample 10% of transactions in production
  tracesSampleRate: 0.1,

  // Session replay - capture 5% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Don't send PII by default
  sendDefaultPii: false,

  // Set environment
  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    // Benign browser errors
    "ResizeObserver loop",
    "Non-Error promise rejection",
    // Network errors that are expected
    "Failed to fetch",
    "NetworkError",
    "Load failed",
  ],
});
