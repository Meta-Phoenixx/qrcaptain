/**
 * Tests for the error message mapping logic used in the sign-in form.
 * This mirrors the getErrorMessage function in sign-in-form.tsx.
 */

function getErrorMessage(error: unknown, isSignUp: boolean): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("InvalidAccountId") ||
    message.includes("Account not found")
  ) {
    return "No account found with this email. Please sign up first.";
  }
  if (
    message.includes("InvalidSecret") ||
    message.includes("Invalid password")
  ) {
    return "Incorrect password. Please try again.";
  }
  if (
    message.includes("AccountAlreadyExists") ||
    message.includes("already exists")
  ) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (
    message.includes("TooManyRequests") ||
    message.includes("rate limit")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (
    message.includes("InvalidEmail") ||
    message.includes("email")
  ) {
    return "Please enter a valid email address.";
  }

  if (isSignUp) {
    return "Could not create account. Please try again.";
  }
  return "Invalid email or password. Please try again.";
}

describe("getErrorMessage", () => {
  describe("sign-in errors", () => {
    it("returns friendly message for InvalidAccountId", () => {
      const error = new Error("InvalidAccountId: account not found");
      expect(getErrorMessage(error, false)).toBe(
        "No account found with this email. Please sign up first."
      );
    });

    it("returns friendly message for Account not found", () => {
      const error = new Error("Account not found for the given email");
      expect(getErrorMessage(error, false)).toBe(
        "No account found with this email. Please sign up first."
      );
    });

    it("returns friendly message for InvalidSecret", () => {
      const error = new Error("InvalidSecret");
      expect(getErrorMessage(error, false)).toBe(
        "Incorrect password. Please try again."
      );
    });

    it("returns friendly message for Invalid password", () => {
      const error = new Error("Invalid password provided");
      expect(getErrorMessage(error, false)).toBe(
        "Incorrect password. Please try again."
      );
    });

    it("returns generic sign-in error for unknown errors", () => {
      const error = new Error("Something unexpected happened");
      expect(getErrorMessage(error, false)).toBe(
        "Invalid email or password. Please try again."
      );
    });
  });

  describe("sign-up errors", () => {
    it("returns friendly message for AccountAlreadyExists", () => {
      const error = new Error("AccountAlreadyExists");
      expect(getErrorMessage(error, true)).toBe(
        "An account with this email already exists. Please sign in instead."
      );
    });

    it("returns friendly message for already exists", () => {
      const error = new Error("User already exists in the system");
      expect(getErrorMessage(error, true)).toBe(
        "An account with this email already exists. Please sign in instead."
      );
    });

    it("returns generic sign-up error for unknown errors", () => {
      const error = new Error("Something unexpected happened");
      expect(getErrorMessage(error, true)).toBe(
        "Could not create account. Please try again."
      );
    });
  });

  describe("rate limiting", () => {
    it("returns friendly message for TooManyRequests", () => {
      const error = new Error("TooManyRequests: please slow down");
      expect(getErrorMessage(error, false)).toBe(
        "Too many attempts. Please wait a moment and try again."
      );
    });

    it("returns friendly message for rate limit", () => {
      const error = new Error("You've hit the rate limit");
      expect(getErrorMessage(error, true)).toBe(
        "Too many attempts. Please wait a moment and try again."
      );
    });
  });

  describe("email validation", () => {
    it("returns friendly message for InvalidEmail", () => {
      const error = new Error("InvalidEmail: bad format");
      expect(getErrorMessage(error, false)).toBe(
        "Please enter a valid email address."
      );
    });
  });

  describe("handles non-Error inputs", () => {
    it("converts strings to error messages", () => {
      expect(getErrorMessage("InvalidSecret", false)).toBe(
        "Incorrect password. Please try again."
      );
    });

    it("handles objects gracefully", () => {
      const result = getErrorMessage({ code: "UNKNOWN" }, true);
      expect(result).toBe("Could not create account. Please try again.");
    });
  });
});
