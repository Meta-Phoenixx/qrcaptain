import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { NextRequest } from "next/server";

// The convexAuthNextjsMiddleware automatically proxies /api/auth requests
// to the Convex backend and sets auth cookies. This route exists so Next.js
// routes the requests through the middleware's proxy logic.
const handler = convexAuthNextjsMiddleware();

export async function GET(request: NextRequest) {
  return (await handler(request, {} as any)) ?? new Response(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  return (await handler(request, {} as any)) ?? new Response(null, { status: 200 });
}
