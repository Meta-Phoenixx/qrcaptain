Condition Survey
·
QR Captain monorepo
·
commit 77042f5
·
14 Aug 2026
QR Captain Hull Survey
A static review of ~57,600 lines of TypeScript across the Convex backend, Next.js web app and Expo mobile shell. Findings are ordered the way a marine surveyor orders them: what sinks the boat first.

Verdict — do not run this in production
The backend leaves four unauthenticated mutations that amount to a public admin console, including one that overwrites any user's password credential and one that deletes user accounts. Any person who knows the deployment URL — which is a public value shipped in the browser bundle — can take over the administrator account and delete the database. No exploit chain, no clever trick: the functions are exported without an auth check and Convex makes every exported function callable by anonymous clients.

The second-order problem is that the project's own quality signals say it is fine. 256 tests pass in 0.8 seconds, CI is green, TypeScript is clean, and there is a documented architecture standard requiring "authentication, role-based access control, least-privilege permissions." None of those gates touch the code that is broken. Treat the green checkmarks as decoration until the test suite is rebuilt.

Findings ledger
Severity reflects reachability and blast radius, not how hard the fix is. Most of the critical set is a one-line change per function.

Summary by severity
Sev	Count	Nature	Exploitable by
Critical	4	Account takeover, data destruction, privilege escalation, mail relay	Anonymous internet
High	5	Access-token predictability, PII disclosure, no rate limiting, missing revocation path	Any registered user
Medium	5	Invoice and tax arithmetic — silent under-billing and duplicate invoice numbers	Normal use, no attacker
Structural	6	Test suite integrity, query performance, architecture drift	—
Critical
Each of these is reachable by someone with no account, using only the public deployment URL.

C-01
Critical
seedFleetVessels.ts exposes twelve unauthenticated admin operations
The file is 1,063 lines of "admin utility" functions exported as public mutation and query. Not one of them calls an auth helper. In Convex, every exported mutation/query is invocable by any anonymous client that has the deployment URL, and that URL ships to every browser as NEXT_PUBLIC_CONVEX_URL.

The three capabilities that matter
convex/seedFleetVessels.ts:977 — setUserPasswordHash({userId, passwordHash}) → writes authAccounts.secret directly
convex/seedFleetVessels.ts:951 — swapUserEmail({userId, newEmail}) → repoints the password credential to any address
convex/seedFleetVessels.ts:926 — findUserByEmail({email}) → returns any user's _id, role and auth accounts
convex/seedFleetVessels.ts:28  — deleteUserById({userId}) → deletes the user, their auth accounts and sessions
convex/seedFleetVessels.ts:876 — clearFleetData() → deletes fleets, vessels, equipment and engine-hour logs
What an attacker does
Look up the admin account by email, repoint its credential to an inbox they control, then run the ordinary "forgot password" flow and receive the OTP. No password hashing knowledge is needed for that path. Alternatively they skip the email entirely and write a credential hash straight into the account. Either way the result is administrator access, and clearFleetData plus deleteUserById mean they can also simply erase the business.

Fix
Delete the file. These are one-off migration scripts that belong in npx convex run against a dev deployment, not in the deployed function set. If any are genuinely needed, convert them to internalMutation, which is not client-callable. This is the single highest-value change in the repository.

C-02
Critical
Users choose their own role at sign-up, including admin
The sign-up form posts its entire FormData to signIn("password", …), and the server-side profile builder reads role straight out of those params with no allowlist. The web UI only offers owner / mechanic / fleet manager in a dropdown, but the dropdown is not the security boundary — the request is.

// convex/auth.ts:10 — inside Password({ profile(params) })
const role = (params.role as string) || "owner";
// ...role flows unvalidated into the inserted users document
convex/auth.ts:10 — role read from client params, never validated
apps/web/components/auth/sign-in-form.tsx:94 — signIn("password", formData) passes the whole form
Fix
Validate against an explicit allowlist in profile() and reject admin outright — admin should only ever be reachable through promoteToAdmin, which does correctly require an existing admin.

C-03
Critical
users.seedAdmin is a public mutation that mints an administrator
The doc comment says to run it from the Convex dashboard or CLI, and the author clearly intended it as an operator tool. It is exported as a public mutation with an empty argument list, so anyone can call it. It creates a user row with role: "admin", or promotes the existing admin@meta-phoenix.io record back to admin if someone had demoted it.

convex/users.ts:53 — export const seedAdmin = mutation({ args: {}, … }) with no auth check
Fix
Convert to internalMutation. It remains runnable via npx convex run and stops being reachable from the internet.

C-04
Critical
Anonymous visitors can send arbitrary HTML email from the company's own domain
Three public marketing endpoints — waitlist, donation and raffle submission — accept an unauthenticated name and email, then schedule a Resend send. The recipient is whatever address the caller supplies, and name is interpolated into the email's HTML body with no escaping and no length limit.

// convex/emails.ts:37 — args.name is attacker-controlled and unescaped
<p style="…">Hey ${args.name}! 🎣</p>
convex/waitlist.ts:7 · convex/donations.ts:7 · convex/raffle.ts:14 — public, unauthenticated, unthrottled
convex/emails.ts:37, 111, 165, 233, 275, 318, 364 — unescaped interpolation into html bodies
Why this is worse than spam
The mail leaves noreply@qrcaptain.com with valid SPF and DKIM. An attacker can inject a link or a fake "verify your account" block into the body and deliver a fully-authenticated phishing email to any address they choose, from the client's own domain. The cost is not just abuse volume — it is the sending reputation of the domain and the liability of having relayed the message.

Fix
HTML-escape every interpolated value, cap field lengths, validate the email format, and put a per-IP and per-address rate limit in front of all three endpoints. Separately: the donation total on the public page is self-reported with no payment processor behind it, so anyone can inflate the fundraiser's "total raised" figure at will.

High
Reachable by anyone who can register an account — which, per C-02, is anyone.

H-01
High
QR codes — the product's physical access token — come from Math.random()
The whole premise of QR Captain is that the sticker on the hull is what grants a mechanic access to a vessel. That token is generated from a timestamp plus eight base-36 characters of Math.random(), which is a non-cryptographic PRNG whose internal state can be recovered from a handful of observed outputs. There is also no collision check against existing codes.

// convex/vessels.ts:15
function generateQRCodeData(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `QRC-${timestamp}-${random}`.toUpperCase();
}
It compounds: getVesselByQRCode accepts any code from any authenticated user of any role and returns the full vessel document plus the owner's name and email address. There is no check that the caller is authorised for that vessel. Self-register as a mechanic, guess or enumerate codes, harvest the owner list.

convex/vessels.ts:15 — Math.random() token generation, no uniqueness constraint
convex/vessels.ts:246 — getVesselByQRCode returns ownerEmail to any authenticated caller
Fix
Generate with crypto.getRandomValues (already used correctly in ResendOTPPasswordReset.ts, so the pattern exists in the codebase), enforce uniqueness on the index, and have the QR lookup return only what an unauthorised scanner should see — vessel name and a "request access" affordance, never the owner's contact details.

H-02
High
No rate limiting anywhere in the application
A grep for rate limiting across the entire repository returns only a notification throttle for work-order updates. Nothing limits sign-up, sign-in, password-reset requests, OTP verification attempts, or any of the public submission endpoints. The password reset OTP is eight digits with unlimited attempts.

Related: the reset email tells the user "This code expires in 15 minutes", but no maxAge is configured on the Email provider, so the token actually lives for the library default. The email is making a promise the code does not keep.

convex/ResendOTPPasswordReset.ts:14 — Email({…}) declares no maxAge; body claims 15 minutes
convex/ResendOTPPasswordReset.ts:11 — digits[byte % 10] over a 0–255 byte introduces slight modulo bias (minor)
H-03
High
Fleet managers cannot revoke mechanic access to vessels they own
The role model forked and only half the code followed. requireOwnerClass treats owner and fleet_manager as equivalent, and createVessel uses it — so a fleet manager can own vessels. But the access-control surface hard-codes requireRole(ctx, "owner"), which excludes them.

convex/accessRequests.ts:176 — getPendingRequestsForOwner returns [] unless role === "owner"
convex/accessRequests.ts:474 — toggleMechanicAccess requires role "owner"
convex/accessRequests.ts:518 — revokeAllMechanicAccess requires role "owner"
convex/workOrders.ts:392, 592, 642 — requestWorkOrder / acceptQuote / declineQuote likewise
convex/vessels.ts:37 — listMyVessels has no fleet_manager branch; returns an empty list
Consequence
A fleet manager who owns vessels never sees an access request, cannot approve or deny one, and — most importantly — has no path to revoke a mechanic's access once granted. That is a missing security control, not just a missing feature. It is also the kind of gap that only shows up in a role you did not test, which is exactly what happened here.

H-04
High
Twenty-two further public functions read data with no authorisation check
Beyond the critical set, a scan of every exported non-internal function found 38 with no auth call in the handler. Some are legitimately public (the marketing pages need getWaitlistCount). These are not:

settings.getSetting — returns any application setting by key to an anonymous caller; the comment above it claims "any authenticated user", which is not what the code does.
storage.getVesselImageUrl — returns a storage URL for any vessel ID, unauthenticated.
storage.getUserProfilePhotoUrl, getMechanicCompanyLogoUrl, getFleetManagerCompanyLogoUrl — call getAuthenticatedUser but then ignore the result whenever an explicit userId argument is supplied.
users.emailExists and seedFleetVessels.findDuplicateUsers — account enumeration oracles.
users.getMechanicProfile, the five public ratings.* queries — arguably fine as public reputation data, but that should be a decision, not an omission.
H-05
High
Route protection is client-side only, and the mobile app is outside every gate
There is no middleware.ts. The admin page guards itself with a useEffect redirect, which is cosmetic — the page and its bundle are served to anyone. This is survivable because the Convex functions behind it do call requireAdmin, so it is defence-in-depth that is missing rather than the control itself. It stops being survivable the moment a query is added without a guard, which has already happened 38 times.

Separately, CI type-checks only web and @qrcaptain/shared. The Expo app — 13 files, ~2,500 lines, including the QR scan flow and its own sign-up screen — is type-checked by nothing, tested by nothing, and shares the backend described above.

Money and correctness
These need no attacker. They are what the invoice module does during normal use.

M-01
Medium
Editing a draft invoice silently deletes the county surtax
createInvoice takes localRateAddOn — the county surtax on top of the state rate — uses it to compute tax, and then never stores it. The invoices table has no such column. When updateInvoiceDraft later recalculates, it falls back to args.localRateAddOn ?? 0, so any edit that does not re-supply the value recomputes the whole invoice at the bare state rate.

// convex/invoices.ts:297
const localRate = args.localRateAddOn ?? 0;   // prior value is unrecoverable
The mechanic under-collects sales tax and remains liable to the state for the difference. In Florida, where the vessel-service tax rules in lib/stateTaxRules.ts are clearly aimed, county surtaxes run to 1.5%.

M-02
Medium
Changing an invoice's tax state does nothing unless you also resend the line items
In updateInvoiceDraft, taxState is read at line 296 but every assignment that uses it sits inside if (args.lineItems). Update the state alone and the mutation returns {success: true} having changed nothing. The UI will show the old state's tax with no error.

convex/invoices.ts:296 vs 337 — taxState only applied inside the lineItems branch
M-03
Medium
Invoice numbers are derived from a row count
generateInvoiceNumber collects every invoice the mechanic has ever issued and uses existing.length + 1 as the sequence. Two invoices created in the same moment collide; voiding an invoice makes the next one reuse a number. Sequential, non-repeating invoice numbering is a statutory requirement in most jurisdictions, and this also loads the mechanic's entire invoice history into memory on every create.

convex/invoices.ts:9 — const seq = (existing.length + 1).toString().padStart(5, "0")
M-04
Medium
recordPayment accepts negative amounts and works on unsent invoices
amount is a bare v.number() with no positivity check, so a payment of -500 is accepted and reduces amountPaid. The only status guard is against void, so a payment can be recorded against a draft invoice that was never sent to anybody. And voidInvoice blocks only fully-paid invoices, so a partially-paid one can be voided with the payment history left dangling.

All monetary values are stored and summed as IEEE-754 doubles. The paid/unpaid decision is newBalance <= 0 against a float, which is exactly where fractional-cent residue causes an invoice to sit permanently at a balance of $0.00 without ever flipping to paid.

convex/invoices.ts:406 — amount: v.number(), no requirePositive
convex/invoices.ts:417, 426 — status guard omits draft; float comparison decides "paid"
convex/invoices.ts:462 — voidInvoice permits voiding a partially-paid invoice
Note
The codebase already has requirePositive and requireNonNegative helpers in convex/lib/validate.ts, and uses them properly on vessel fields. The money path just does not call them.

The test suite is the most misleading artifact in the repo
This is the finding that most changes how you should read everything else.

256
tests passing
0.8s
total runtime
0
Convex query or mutation handlers executed
~1%
of the 15,518-line backend under test
The four "user flow" suites do not import the code they claim to test
owner-flows, mechanic-flows, captain-flows and fleet-manager-flows total 1,455 lines and 98 tests, with header comments promising coverage of vessel access control, quote approval, mechanic authorisation and ratings. Their complete import list is a mock context helper and two tiny validation utilities. No test in the repository imports convex/vessels, convex/workOrders, convex/invoices, convex/users, convex/accessRequests, or _generated/api.

What the tests actually do is restate a literal in the test file and then assert on the literal:

// __tests__/flows/owner-flows.test.ts:89 — "owner cannot access another owner's vessel"
const isOwner = OTHER_VESSEL.ownerId === OWNER._id;   // "owner2" === "owner1"
expect(isOwner).toBe(false);
That test asserts that two string constants declared thirty lines earlier are different. It passes whether or not requireVesselOwnerOrAdmin exists. You could delete the entire convex/ directory and 254 of the 256 tests would still be green. The only real application code covered is lib/validate.ts, lib/errors.ts and lib/servicePredictor.ts — about 161 lines.

The 21 Python files in testsprite_tests/ are in the same category: they target HTTP endpoints such as /api/auth/register and /api/users, and this application has zero Next.js API routes. They cannot ever have run against it.

I want to be precise about the implication rather than dramatic: this does not mean the features are broken. It means no automated evidence exists that any of them work, and the green CI badge is actively misleading anyone who inherits this code — which is you.

Performance
Nothing here is urgent at current data volumes. All of it becomes urgent at the same time.

P-01
Structural
51 unindexed full-table scans, including on users, vessels and workOrders
Convex charges and bounds by documents scanned, and a query that reads more than 16,384 documents fails outright rather than degrading. Several of these sit in hot paths: vessels.ts:54 collects every vessel for the admin view; settings.ts:269–294 collects users, vessels, fleets, authorisations and work orders in a single stats query; waitlist.getWaitlistCount collects the entire signup table to return a count and runs on the public landing page.

The schema does define good indexes — by_owner, by_vessel, by_qr_code and others are all present and used correctly elsewhere. The scans are places where .withIndex() was simply not reached for, and .filter() was used instead, which does not narrow the scan.

P-02
Structural
Next.js App Router used as a client-only SPA
101 of 105 components are "use client". There are no server components, no server-side data fetching, and no streaming — every page ships its JavaScript, boots React, connects to Convex, and only then begins to fetch. dashboard.tsx is 2,720 lines with 22 useQuery calls in one component, each an independent subscription.

This also undercuts the SEO work the project's own CLAUDE.md asks for: only three routes export metadata, and there is no sitemap.ts or robots.ts. The marketing surfaces — landing, donate, raffle — are the pages that would most benefit from being server-rendered, and they are client components too.

Code quality and process
Credit where it is due first — this is not a codebase without craft.

What is genuinely good
The auth helper library in convex/lib/auth.ts is well designed: clear separation between "returns null" and "throws", role-class shorthands, and vessel-level helpers that check both direct and fleet-level mechanic authorisation. The problem is not that the abstraction is wrong — it is that 38 functions never call it. Likewise: the CI pipeline has proper gates with gitleaks running first, no secrets are committed anywhere in 129 commits of history, the schema is thoroughly indexed and commented, audit logging exists and is used on sensitive mutations, admin impersonation is correctly read-only, and there are no XSS sinks in the frontend at all.

Q-01
Structural
Remaining observations
@qrcaptain/shared is dead code. The workspace package holds Zod validations, constants and utilities. Its only importer is its own test file. Neither app nor the backend uses it, so the validation schemas it defines are not enforcing anything.
Content is stored in function files. helpGuides.ts is 1,793 lines, of which roughly 1,350 are hard-coded guide prose inside seed mutations. Editing a help article requires a backend deploy.
Component sizes. dashboard.tsx at 2,720 lines, then four more components over 1,200. These are the files where the role-branching bugs like H-03 hide.
The gitleaks config allowlists every Markdown file ('''\.md$'''). The repo contains 33 Markdown files including planning docs and Cursor plans — a natural place for someone to paste a key while debugging, and the scanner is told to ignore them.
pnpm audit runs with continue-on-error: true and a comment saying to flip it "once audit is clean". It reports and never blocks.
Two Convex deployment identifiers are published in convex/.env.example (tame-grasshopper-654, ceaseless-pheasant-78). Ordinarily harmless; combined with C-01 it means this repository alone is sufficient to locate and compromise the deployment. Rotate after remediation.
Housekeeping the project's own rules ask for. CLAUDE.md requires version_history.md to be updated every session; the file does not exist. There is a stray empty convex/convex/ directory, and a temporary screenshots/ folder with 35 committed PNGs.
What I would do, in order
The first three are hours of work, not days, and they close every critical finding.

Remediation sequence
#	Action	Closes	Effort
1	Delete seedFleetVessels.ts; convert users.seedAdmin to internalMutation	C-01, C-03	~1 hour
2	Allowlist role in auth.ts profile(), excluding admin	C-02	~30 min
3	Escape email interpolation; rate-limit and length-cap the three public submission endpoints	C-04	~3 hours
4	Audit all 38 unguarded public functions; make each one either explicitly public by decision or guarded	H-04	~1 day
5	Rotate both Convex deployments and force a password reset for every existing account	post-C-01 hygiene	~2 hours
6	Re-key QR generation to crypto.getRandomValues; strip owner PII from the QR lookup response	H-01	~half day
7	Unify the owner / fleet_manager role split across accessRequests, workOrders and vessels	H-03	~1 day
8	Replace the flow tests with real handler tests using convex-test, starting with authorisation	test integrity	~1 week
9	Fix the invoice tax, numbering and payment-validation defects	M-01 → M-04	~2 days
Step 5 matters and is easy to skip. Because C-01 has been deployable for the life of the project, you cannot assume it was never used. Treat existing credentials as untrusted, and check the auditLogs table and Convex function logs for calls to seedFleetVessels:* before you delete the file.

Static review only. Nothing was executed against a live deployment, no credentials were used, and no files in the repository were modified. Findings were verified by reading source at the cited lines; the test-coverage claims were verified by running the suite and enumerating imports.

Not covered: the Expo mobile app beyond file inventory, the helpGuides and mechanicDirectory modules in depth, dependency CVEs, and any runtime or infrastructure configuration held in the Convex dashboard.