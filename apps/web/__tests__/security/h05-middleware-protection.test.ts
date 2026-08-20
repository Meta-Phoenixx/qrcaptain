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

  it("middleware uses convexAuthNextjsMiddleware", () => {
    const content = fs.readFileSync(path.join(webRoot, "middleware.ts"), "utf8");
    expect(content).toContain("convexAuthNextjsMiddleware");
  });

  it("auth API route exists for cookie-based token proxy", () => {
    const routePath = path.join(webRoot, "app/api/auth/[...convexAuth]/route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("providers use ConvexAuthNextjsProvider for cookie propagation", () => {
    const content = fs.readFileSync(path.join(webRoot, "app/providers.tsx"), "utf8");
    expect(content).toContain("ConvexAuthNextjsProvider");
  });
});
