// @ts-ignore — proxyAuthActionToConvex is a sub-export not in the main types
import { proxyAuthActionToConvex } from "@convex-dev/auth/nextjs/server/proxy";
import { NextRequest } from "next/server";

// Proxy auth token storage to cookies so middleware can check auth server-side.
export async function GET(request: NextRequest) {
  return proxyAuthActionToConvex(request, {
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  });
}

export async function POST(request: NextRequest) {
  return proxyAuthActionToConvex(request, {
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  });
}
