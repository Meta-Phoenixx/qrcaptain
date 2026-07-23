const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  displayName: "web",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@qrcaptain/shared$": "<rootDir>/../../packages/shared/src",
    "^convex-lib/(.*)$": "<rootDir>/../../convex/lib/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/__tests__/test-utils.tsx",
    "<rootDir>/__tests__/test-helpers/",
  ],
};

module.exports = createJestConfig(config);
