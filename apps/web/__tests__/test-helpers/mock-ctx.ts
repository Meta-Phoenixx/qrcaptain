/**
 * Lightweight Convex context mock for unit-testing handler logic
 * without spinning up the Convex runtime.
 *
 * Usage:
 *   const ctx = buildCtx({ role: "owner", userId: "user1" });
 *   ctx.db.get.mockResolvedValue({ _id: "v1", ownerId: "user1", name: "Sea Ray" });
 */

/** Minimal user shape mirroring the Convex "users" table. */
export interface MockUser {
  _id: string;
  role: "admin" | "owner" | "mechanic" | "fleet_manager" | "captain";
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  tokenIdentifier?: string;
}

/** Minimal vessel shape. */
export interface MockVessel {
  _id: string;
  ownerId: string;
  name: string;
  status?: string;
  fleetId?: string;
  insuranceInfo?: { provider: string; policyNumber: string; insuredName: string; expiryDate: number } | null;
}

/** Minimal fleet shape. */
export interface MockFleet {
  _id: string;
  ownerId: string;
  name: string;
  fleetType?: string;
}

/** Tiny query builder — supports .withIndex().filter().first() / .collect() / .unique() */
function buildQueryBuilder(results: unknown[]) {
  const builder = {
    withIndex: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    take: jest.fn().mockImplementation((n: number) => Promise.resolve(results.slice(0, n))),
    collect: jest.fn().mockResolvedValue(results),
    first: jest.fn().mockResolvedValue(results[0] ?? null),
    unique: jest.fn().mockResolvedValue(results[0] ?? null),
  };
  return builder;
}

export interface CtxOptions {
  /** The authenticated user (sets both auth + db.get for the user lookup) */
  user?: MockUser;
  /** Additional docs returned by ctx.db.get keyed by their _id */
  docs?: Record<string, unknown>;
  /** Results returned by ctx.db.query, keyed by table name */
  queryResults?: Record<string, unknown[]>;
}

export function buildCtx(opts: CtxOptions = {}) {
  const { user, docs = {}, queryResults = {} } = opts;

  const allDocs: Record<string, unknown> = { ...docs };
  if (user) allDocs[user._id] = user;

  const db = {
    get: jest.fn().mockImplementation((id: string) => Promise.resolve(allDocs[id] ?? null)),
    insert: jest.fn().mockImplementation((_table: string, _doc: unknown) =>
      Promise.resolve(`generated_id_${Math.random().toString(36).slice(2)}`),
    ),
    patch: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockImplementation((table: string) =>
      buildQueryBuilder(queryResults[table] ?? []),
    ),
  };

  const auth = {
    getUserIdentity: jest.fn().mockResolvedValue(
      user ? { tokenIdentifier: user.tokenIdentifier ?? `token_${user._id}`, subject: user._id } : null,
    ),
  };

  return { db, auth };
}

/** Assert that ctx.db.insert was called for a specific table */
export function assertInserted(ctx: ReturnType<typeof buildCtx>, table: string) {
  const calls = (ctx.db.insert as jest.Mock).mock.calls;
  const match = calls.find(([t]: [string]) => t === table);
  expect(match).toBeDefined();
  return match ? match[1] : null;
}

/** Assert that ctx.db.patch was called for a specific id */
export function assertPatched(ctx: ReturnType<typeof buildCtx>, id: string) {
  const calls = (ctx.db.patch as jest.Mock).mock.calls;
  const match = calls.find(([i]: [string]) => i === id);
  expect(match).toBeDefined();
  return match ? match[1] : null;
}
