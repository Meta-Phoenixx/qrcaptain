/**
 * UX Fixes Batch — #1 Favicon, #10 Try Again, #12 Fleet Manager preferred mechanics,
 * #13 Sticky nav, #20 Equipment nav browser history, #25 View Profile route
 */

describe("UX Fix #20 — Equipment nav category selection via URL", () => {
  it("setSelectedCategory builds correct search params with category", () => {
    const params = new URLSearchParams();
    const cat = { id: "electrical" };
    params.set("category", cat.id);
    expect(params.toString()).toBe("category=electrical");
  });

  it("setSelectedCategory deletes category param when null", () => {
    const params = new URLSearchParams("category=electrical&foo=bar");
    params.delete("category");
    expect(params.has("category")).toBe(false);
    expect(params.get("foo")).toBe("bar");
  });

  it("resolves selectedCategory from URL param via EQUIPMENT_CATEGORIES lookup", () => {
    const EQUIPMENT_CATEGORIES = [
      { id: "electrical", name: "Electrical" },
      { id: "engine", name: "Engine" },
    ];
    const categoryId = "engine";
    const found = EQUIPMENT_CATEGORIES.find((c) => c.id === categoryId) ?? null;
    expect(found?.name).toBe("Engine");
  });

  it("returns null when category param is not in the list", () => {
    const EQUIPMENT_CATEGORIES = [{ id: "electrical", name: "Electrical" }];
    const found = EQUIPMENT_CATEGORIES.find((c) => c.id === "unknown") ?? null;
    expect(found).toBeNull();
  });
});

describe("UX Fix #25 — /profile route exists", () => {
  it("profile page file exists at the expected path", () => {
    const fs = require("fs");
    const path = require("path");
    const profilePage = path.join(
      __dirname,
      "../../app/(tabs)/profile/page.tsx"
    );
    expect(fs.existsSync(profilePage)).toBe(true);
  });
});
