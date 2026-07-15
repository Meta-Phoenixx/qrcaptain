#!/usr/bin/env bash
# Validates that required environment variables are set before production deployment.
# Exits non-zero if any required variable is missing.

set -euo pipefail

MISSING=()

check() {
  local var="$1"
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
}

# --- Required for web build ---
check "NEXT_PUBLIC_CONVEX_URL"

# --- Required for Convex production deploy ---
if [[ "${CONVEX_PROD_DEPLOY:-false}" == "true" ]]; then
  check "CONVEX_DEPLOY_KEY"
fi

# --- Report ---
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required environment variables:"
  for var in "${MISSING[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo "OK: All required environment variables are set."
