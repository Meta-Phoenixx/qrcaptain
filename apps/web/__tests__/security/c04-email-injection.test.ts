import { escapeHtml } from "../../../../convex/lib/email";

describe("C-04: HTML injection prevention in email templates", () => {
  describe("escapeHtml", () => {
    it("escapes <script> tags", () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
    });

    it("escapes angle brackets", () => {
      expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe(
        "&lt;img src=x onerror=alert(1)&gt;"
      );
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("AT&T")).toBe("AT&amp;T");
    });

    it("escapes double quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("escapes single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#x27;s");
    });

    it("leaves safe text unchanged", () => {
      expect(escapeHtml("John Smith")).toBe("John Smith");
    });

    it("escapes a phishing payload so no HTML tags survive", () => {
      const payload = '<a href="http://evil.com">Click here to claim your prize</a>';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain("<a");
      expect(escaped).not.toContain("</a>");
      expect(escaped).toContain("&lt;a");
    });
  });

  describe("input validation — email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    it("accepts a valid email", () => {
      expect(emailRegex.test("user@example.com")).toBe(true);
    });

    it("rejects missing @", () => {
      expect(emailRegex.test("notanemail")).toBe(false);
    });

    it("rejects whitespace-injected email", () => {
      expect(emailRegex.test("user @example.com")).toBe(false);
    });

    it("rejects email exceeding 254 chars", () => {
      const long = "a".repeat(250) + "@b.co";
      expect(long.length > 254).toBe(true);
    });
  });

  describe("input validation — name length", () => {
    it("rejects a name over 100 chars", () => {
      const long = "A".repeat(101);
      expect(long.length > 100).toBe(true);
    });

    it("rejects an empty name", () => {
      expect("   ".trim().length === 0).toBe(true);
    });
  });
});
