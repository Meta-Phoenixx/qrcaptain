import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Routes that require authentication
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

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request) && !convexAuth.isAuthenticated()) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)"],
};
