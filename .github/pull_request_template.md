## Summary

<!-- What does this PR do? 1–3 bullet points. -->

-
-

## Layer(s) affected

<!-- Check all that apply -->

- [ ] Convex backend (queries / mutations / schema)
- [ ] Service layer (`convex/services/`)
- [ ] Vendor module (`convex/vendors/`)
- [ ] Web app (`apps/web/`)
- [ ] Mobile app (`apps/mobile/`)
- [ ] Shared package (`packages/shared/`)
- [ ] CI / deployment (`.github/`)
- [ ] Architecture docs (`02_architecture/`)

## Checklist

- [ ] Auth/permission checks enforced in all new/modified Convex functions
- [ ] Audit log entry added for any mutation that changes important state
- [ ] Input validation added at function boundary
- [ ] No business logic added directly to UI components (hooks or service layer only)
- [ ] No raw vendor API calls outside `convex/vendors/`
- [ ] No `transition-all` used in any CSS/Tailwind
- [ ] No default Tailwind blue/indigo used — `captain` palette only
- [ ] TypeScript passes (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Tests pass (`npm test` in `apps/web/`)
- [ ] Tested against **dev** Convex deployment (never production directly)
- [ ] `version_history.md` updated if applicable

## Security / data-leak check

<!-- Did this change touch anything that could expose data to the wrong user? If yes, describe how you verified it is safe. -->

N/A / details:

## Test plan

<!-- How was this verified? Steps to reproduce the happy path and any edge cases. -->

1.
2.
