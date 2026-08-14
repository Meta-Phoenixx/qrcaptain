"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard, GlassInput, GlassButton } from "../ui/glass";
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

type AuthView = "signIn" | "forgotPassword" | "resetCode";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [view, setView] = useState<AuthView>("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const { mode } = useTheme();

  const isSignUp = false; // Sign-up disabled — invite/waitlist only

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", isSignUp ? "signUp" : "signIn");
    
    if (isSignUp) {
      // Block sign-up if the email is already registered
      if (emailAlreadyExists) {
        setError("An account with this email already exists. Please sign in instead.");
        setIsLoading(false);
        return;
      }

      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;
      formData.set("name", `${firstName} ${lastName}`.trim());
    }

    try {
      await signIn("password", formData);
      router.push("/home");
    } catch (err) {
      setError(getErrorMessage(err, isSignUp));
      setIsLoading(false);
    }
  };

  // Step 1: Send password reset code
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    formData.set("flow", "reset");

    try {
      await signIn("password", formData);
      setResetEmail(email);
      setView("resetCode");
      setSuccessMessage("Check your email for a reset code.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Account not found") || message.includes("InvalidAccountId")) {
        setError("No account found with this email address.");
      } else if (message.includes("TooManyRequests") || message.includes("rate limit")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Could not send reset code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code and set new password
  const handleResetVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", "reset-verification");
    formData.set("email", resetEmail);

    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    try {
      await signIn("password", formData);
      router.push("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("InvalidCode") || message.includes("code")) {
        setError("Invalid or expired code. Please try again.");
      } else {
        setError("Could not reset password. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMessage(null);
  };

  const labelClass = `block text-sm font-medium mb-1 ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`;

  // ---------- Forgot Password: Step 1 - Enter email ----------
  if (view === "forgotPassword") {
    return (
      <GlassCard className="p-8">
        <h2 className={`mb-2 text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
          Reset Password
        </h2>
        <p className={`mb-6 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          Enter your email and we&apos;ll send you a code to reset your password.
        </p>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className={labelClass}>
              Email
            </label>
            <GlassInput
              id="reset-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
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
            {isLoading ? "Sending code..." : "Send Reset Code"}
          </GlassButton>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => switchView("signIn")}
            className={`text-sm transition-colors ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            Back to sign in
          </button>
        </div>
      </GlassCard>
    );
  }

  // ---------- Forgot Password: Step 2 - Enter code + new password ----------
  if (view === "resetCode") {
    return (
      <GlassCard className="p-8">
        <h2 className={`mb-2 text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
          Enter Reset Code
        </h2>
        <p className={`mb-6 text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          We sent a code to <strong className={mode === 'dark' ? "text-white" : "text-gray-900"}>{resetEmail}</strong>. Enter it below with your new password.
        </p>

        {successMessage && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-500 mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleResetVerification} className="space-y-4">
          <div>
            <label htmlFor="reset-code" className={labelClass}>
              Reset Code
            </label>
            <GlassInput
              id="reset-code"
              name="code"
              type="text"
              required
              placeholder="Enter 8-digit code"
              autoComplete="one-time-code"
              className="text-center tracking-widest text-lg"
            />
          </div>

          <div>
            <label htmlFor="new-password" className={labelClass}>
              New Password
            </label>
            <GlassInput
              id="new-password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Confirm Password
            </label>
            <GlassInput
              id="confirm-password"
              name="confirmPassword"
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
            {isLoading ? "Resetting password..." : "Reset Password"}
          </GlassButton>
        </form>

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => switchView("forgotPassword")}
            className={`text-sm transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
          >
            Try a different email
          </button>
          <span className={`text-sm ${mode === 'dark' ? "text-gray-600" : "text-gray-300"}`}>|</span>
          <button
            onClick={() => switchView("signIn")}
            className={`text-sm transition-colors ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            Back to sign in
          </button>
        </div>
      </GlassCard>
    );
  }

  // ---------- Default: Sign In / Sign Up ----------
  return (
    <GlassCard className="p-8">
      <h2 className={`mb-6 text-2xl font-bold font-heading ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>
        {isSignUp ? "Create Account" : "Welcome Back"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className={labelClass}
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
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className={`text-sm font-medium ${mode === 'dark' ? "text-gray-300" : "text-gray-700"}`}
            >
              Password
            </label>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => switchView("forgotPassword")}
                className={`text-xs transition-colors ${mode === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                Forgot password?
              </button>
            )}
          </div>
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
        <p className={`text-xs ${mode === 'dark' ? "text-white/25" : "text-gray-400"}`}>
          QR Captain is currently in private beta.
        </p>
      </div>
    </GlassCard>
  );
}
