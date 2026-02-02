"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

// Map technical error messages to user-friendly ones
function getErrorMessage(error: unknown, isSignUp: boolean): string {
  const message = error instanceof Error ? error.message : String(error);
  
  // Handle common auth errors
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
  
  // Default messages
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", isSignUp ? "signUp" : "signIn");

    try {
      const result = await signIn("password", formData);
      
      // If there's a redirect (OAuth), handle it
      if (result && typeof result === 'object' && 'redirect' in result) {
        window.location.href = result.redirect as string;
        return;
      }
      
      // For password auth, the signIn completed
      // Reset loading and let the auth state update trigger re-render
      setIsLoading(false);
    } catch (err) {
      setError(getErrorMessage(err, isSignUp));
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        {isSignUp ? "Create Account" : "Welcome Back"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required={isSignUp}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                I am a...
              </label>
              <select
                id="role"
                name="role"
                required={isSignUp}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              >
                <option value="owner">Boat Owner</option>
                <option value="mechanic">Marine Mechanic</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-captain-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-captain-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-captain-600 hover:text-captain-700"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
