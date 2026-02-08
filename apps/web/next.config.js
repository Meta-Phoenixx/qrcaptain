const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@qrcaptain/shared"],
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production CI builds
  silent: !process.env.CI,

  // Hide source maps from users in production
  hideSourceMaps: true,

  // Prevent Sentry from attempting source map upload without auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
