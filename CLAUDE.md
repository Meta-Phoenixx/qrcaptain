# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QR Captain is a vessel maintenance tracking platform for boat owners and marine mechanics. Users scan QR codes on boats to access service history and document maintenance work with photos, parts, and warranty info.

## Architecture Framework

The active architecture standard lives at:

```
02_architecture/project-architecture-rules.md
```

Supporting reference material (Mike's system frameworks):

```
02_architecture/reference/mike-systems-beginner-guide.md
02_architecture/reference/mike-systems-breakdown.md
02_architecture/reference/mike-systems-extraction.md
```

**Before reviewing, planning, or building:** read `02_architecture/project-architecture-rules.md` as the source of truth for layer placement, service layer rules, security rules, and deployment standards.

## Architecture

Turborepo monorepo with three workspaces:

- **`apps/web/`** — Next.js 14 (App Router), Tailwind CSS, TypeScript
- **`apps/mobile/`** — React Native + Expo with expo-router
- **`convex/`** — Convex backend (real-time DB, auth, serverless functions, file storage)
- **`packages/shared/`** — Shared TypeScript types and Zod validations

Web and mobile share the same Convex backend. Auth uses `@convex-dev/auth` with password + OTP (via Resend). Three user roles: `admin`, `owner`, `mechanic` — all Convex functions enforce role-based access control.

## Commands

```bash
# Development (from repo root)
pnpm dev              # All apps via turbo
pnpm dev:web          # Web only (Next.js on localhost:3000)
pnpm dev:mobile       # Mobile only (Expo)
pnpm dev:convex       # Convex backend (cd convex && npx convex dev)

# Build, lint, type-check
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm type-check       # TypeScript checks across all apps

# Tests (web only, from apps/web/)
npm test              # Run Jest tests
npm test -- --testPathPattern=path/to/test  # Single test file

# Convex deployment — ALWAYS run from repo root
pnpm deploy:convex           # Deploy to dev
pnpm deploy:convex:prod      # Deploy to production (striped-greyhound-919)

# Cleanup
pnpm clean            # Remove turbo cache and node_modules
```

## Key Conventions

- **Package manager**: pnpm 9+ (do not use npm/yarn at the root)
- **Node version**: 18+
- **Web routing**: Next.js App Router (`apps/web/app/`)
  - `(auth)/` — auth routes, `(tabs)/` — tab-based dashboard routes
- **Convex functions**: Organized by domain — `users.ts`, `vessels.ts`, `workOrders.ts`, `ratings.ts`, `notifications.ts`, `mechanicDirectory.ts`, etc.
- **Convex auto-generated types**: `convex/_generated/` — never edit these manually
- **Brand colors**: Custom `captain` palette in `apps/web/tailwind.config.ts` (sky-blue family). Never use default Tailwind blue/indigo.
- **Fonts**: Ubuntu for headings (`font-heading`), Inter for body (`font-inter`)
- **Environment variables**: `NEXT_PUBLIC_CONVEX_URL` (web), `EXPO_PUBLIC_CONVEX_URL` (mobile), Convex backend vars set in Convex dashboard

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.
- **Invoke the `clean-code` skill** after writing code to verify it was properly structured, every session, no exceptions.
- **Invoke the `seo-optimizer` skill** after the page has been completed, run a verification check for SEO and modify where necessary, every session, no exceptions.

## Project Assets
- `photos/` — iOS photos (HEIC/JPG). Use these as real content instead of placeholders.
- `brand_assets/` — Check here first for logos, color guides, and style guides before designing.
- `logo/` — Brand logo files.
- `style-guide/` — Design guidelines.
- `references/` — Reference images for design matching.

## Screenshot Workflow
- Check if Puppeteer is installed (`node -e "require('puppeteer')"`) — if not, install it: `npm install puppeteer`
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved to `./temporary screenshots/screenshot-N.png` (auto-incremented).
- Optional label: `node screenshot.mjs http://localhost:3000 label` → `screenshot-N-label.png`
- After screenshotting, read the PNG with the Read tool to analyze it.
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette. Use the `captain` brand palette.
- **Shadows:** Use layered, color-tinted shadows with low opacity. Never flat `shadow-md`.
- **Typography:** Pair Ubuntu (headings) with Inter (body). Tight tracking on large headings, generous line-height on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states.
- **Images:** Add gradient overlay and color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens.
- **Depth:** Use a layering system (base → elevated → floating).

## GitHub & Deployment Rules
- **GitHub repo:** `https://github.com/Meta-Phoenixx/qrcaptain`
- **Branch protection:** Never push directly to `main`. All changes go through a PR.
- **Branch naming:** `feature/`, `fix/`, `refactor/`, `chore/` prefixes.
- **Convex deployments:** Always develop and test against the **dev** Convex deployment first. Never run `npx convex deploy` against production without explicit confirmation.
- **Convex deploy directory — CRITICAL:** ALWAYS run from the repo root. The `convex/` subdirectory's `package.json` is for dependencies only — deploying from inside it wipes all prod functions. Use `pnpm deploy:convex:prod` exclusively.
- **Secrets:** Never commit `.env`, `.env.local`, or any file containing API keys. All secrets live in GitHub repository secrets or Vercel environment variables.

## Hard Rules
- Do a full analysis of the directory to understand the project and update `version_history.md` every session.
- Do not add sections, features, or content not in a reference.
- Do not "improve" a reference design — match it.
- Do not stop after one screenshot pass — at least 2 rounds.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color.
- **For every new feature, write a Jest test in `apps/web/__tests__/` that covers the core functionality before marking the feature complete. No exceptions.**
- **NEVER run `vercel`, `vercel link`, or any Vercel CLI deployment command.** Deployments happen exclusively via the Vercel GitHub Integration — it auto-deploys on every merge to `main`. Running CLI deploys corrupts the project linkage and pushes broken builds to production. If a deploy does not trigger automatically, instruct the user to trigger a redeploy from the Vercel dashboard.

## Install Skills
```
npx claude-code-templates@latest --skill=creative-design/mobile-design --yes
npx claude-code-templates@latest --skill=creative-design/ui-ux-pro-max --yes
npx claude-code-templates@latest --skill media/image-enhancer
npx claude-code-templates@latest --skill=business-marketing/seo-optimizer --yes
npx claude-code-templates@latest --skill=business-marketing/content-creator --yes
npx claude-code-templates@latest --skill=development/clean-code --yes
```
