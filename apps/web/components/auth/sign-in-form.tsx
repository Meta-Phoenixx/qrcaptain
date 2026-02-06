"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { GlassCard, GlassInput, GlassButton, GlassSelect } from "../ui/glass";
import { useTheme } from "../providers/theme-provider";

// Map technical error messages to user-friendly ones
function getErrorMessage(error: unknown, isSignUp: boolean): string {
  // ... existing implementation ...
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes("InvalidAccountId") || message.includes("Account not found")) {
    return "No account found with this email. Please sign up first.";
  }
  if (message.includes("InvalidSecret") || message.includes("Invalid password")) {
    return "Incorrect password. Please try again.";
  }
  if (message.includes("AccountAlreadyExists") || message.includes("already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("TooManyRequests") || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (message.includes("InvalidEmail") || message.includes("email")) {
    return "Please enter a valid email address.";
  }
  
  if (isSignUp) {
    return "Could not create account. Please try again.";
  }
  return "Invalid email or password. Please try again.";
}

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("owner");
  const { mode } = useTheme();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // ... existing implementation ...
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", isSignUp ? "signUp" : "signIn");
    
    if (isSignUp) {
      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      formData.set("name", `${firstName} ${lastName}`.trim());
    }

    try {
      const result = await signIn("password", formData);
      
      if (result && typeof result === 'object' && 'redirect' in result) {
        const redirect = result.redirect;
        window.location.href = typeof redirect === 'string' ? redirect : redirect?.toString() || '/';
        return;
      }
      
      setIsLoading(false);
    } catch (err) {
      setError(getErrorMessage(err, isSignUp));
      setIsLoading(false);
    }
  };

  const isMechanic = isSignUp && selectedRole === "mechanic";

  return (
    <GlassCard className="p-8">
      <h2 className={`mb-6 text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
        {isSignUp ? "Create Account" : "Welcome Back"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
                >
                  First Name
                </label>
                <GlassInput
                  id="firstName"
                  name="firstName"
                  type="text"
                  required={isSignUp}
                  placeholder="John"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
                >
                  Last Name
                </label>
                <GlassInput
                  id="lastName"
                  name="lastName"
                  type="text"
                  required={isSignUp}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="role"
                className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
              >
                I am a...
              </label>
              <GlassSelect
                id="role"
                name="role"
                required={isSignUp}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="owner">Boat Owner</option>
                <option value="mechanic">Marine Mechanic</option>
              </GlassSelect>
            </div>

            {/* Additional required fields for mechanics */}
            {isMechanic && (
              <>
                <div className={`pt-2 border-t ${mode === 'dark' ? "border-white/10" : "border-gray-100"}`}>
                  <p className={`text-xs mb-3 ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
                    As a marine mechanic, we need a few more details to set up your account.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="companyName"
                    className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <GlassInput
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    placeholder="ABC Marine Services"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <GlassInput
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="(555) 123-4567"
                  />
                </div>
              </>
            )}
          </>
        )}

        <div>
          <label
            htmlFor="email"
            className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
          >
            Email
          </label>
          <GlassInput
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className={`block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
          >
            Password
          </label>
          <GlassInput
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <GlassButton
          type="submit"
          disabled={isLoading}
          className="w-full mt-4"
        >
          {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
        </GlassButton>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className={`text-sm transition-colors ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </GlassCard>
  );
}
