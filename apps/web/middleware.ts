import { createRouteMatcher } from "@convex-dev/auth/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/home(.*)",
  "/my-dashboard(.*)",
  "/my-vessels(.*)",
  "/my-work-orders(.*)",
  "/vessels(.*)",
  "/work-orders(.*)",
  "/fleet(.*)",
  "/mechanics(.*)",
  "/maintenance(.*)",
  "/calendar(.*)",
  "/parts(.*)",
  "/reports(.*)",
  "/documents(.*)",
  "/invoices(.*)",
  "/alerts(.*)",
  "/profile(.*)",
  "/help(.*)",
  "/admin(.*)",
]);

export function middleware(request: NextRequest) {
  if (isProtectedRoute(request)) {
    // __auth is a lightweight session cookie set by SessionCookieSync in
    // providers.tsx after client-side auth succeeds. It is not the JWT itself
    // (data is protected at the Convex function level), but it does prevent
    // unauthenticated browsers from loading dashboard page bundles.
    const authCookie = request.cookies.get("__auth");
    if (!authCookie) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
