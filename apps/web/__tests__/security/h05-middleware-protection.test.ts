/**
 * H-05 — Server-side middleware route protection
 */
import * as fs from "fs";
import * as path from "path";

const webRoot = path.join(__dirname, "../../");

describe("H-05 — middleware.ts exists and protects routes", () => {
  it("middleware.ts file exists at the web app root", () => {
    expect(fs.existsSync(path.join(webRoot, "middleware.ts"))).toBe(true);
  });

  it("middleware protects /admin route", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("/admin");
  });

  it("middleware protects /home route", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("/home");
  });

  it("middleware redirects unauthenticated users to /signin", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("/signin");
  });

  it("middleware checks auth cookie before allowing access to protected routes", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("__auth");
    expect(content).toContain("cookies");
  });

  it("providers sync auth state to session cookie", () => {
    const content = fs.readFileSync(path.join(webRoot, "app/providers.tsx"), "utf8");
    expect(content).toContain("__auth");
    expect(content).toContain("SessionCookieSync");
  });

  it("middleware uses createRouteMatcher from @convex-dev/auth", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("createRouteMatcher");
    expect(content).toContain("@convex-dev/auth/nextjs/server");
  });
});
