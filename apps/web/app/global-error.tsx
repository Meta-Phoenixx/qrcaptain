"use client";

import { useEffect } from "react";

function translateError(error: Error): { title: string; explanation: string; suggestion: string } {
  const msg = (error?.message ?? "").toLowerCase();
  const name = (error?.name ?? "").toLowerCase();

  if (msg.includes("not found") || msg.includes("404") || name.includes("notfound")) {
    return {
      title: "Resource not found",
      explanation: "The page tried to load something that no longer exists.",
      suggestion: "Go back and try again, or return to the home page.",
    };
  }
  if (msg.includes("permission") || msg.includes("unauthorized") || msg.includes("403")) {
    return {
      title: "Access denied",
      explanation: "You don't have permission to view this content.",
      suggestion: "Sign in with an authorized account or request access from the vessel owner.",
    };
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return {
      title: "Network error",
      explanation: "The app couldn't reach QR Captain servers.",
      suggestion: "Check your connection and try refreshing.",
    };
  }
  if (msg.includes("chunk") || msg.includes("module")) {
    return {
      title: "Page load error",
      explanation: "Part of the app failed to load after a recent update.",
      suggestion: "Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R).",
    };
  }
  return {
    title: "Unexpected error",
    explanation: error?.message || "Something went wrong.",
    suggestion: "Try refreshing. If it persists, share the error details below with the team.",
  };
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[QR Captain global error]", error);
  }, [error]);

  const { title, explanation, suggestion } = translateError(error);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f1929", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ width: "100%", maxWidth: "480px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="24" height="24" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 style={{ margin: 0, color: "white", fontSize: "20px", fontWeight: 700 }}>{title}</h1>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>Something went wrong</p>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>What happened</p>
              <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.9)", fontSize: "14px", lineHeight: "1.6" }}>{explanation}</p>
              <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>What to do</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "14px", lineHeight: "1.6" }}>{suggestion}</p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <button onClick={() => { window.location.reload(); }} style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "#0ea5e9", border: "none", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Try Again
              </button>
              <a href="/home" style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: 500, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Go Home
              </a>
            </div>

            <details style={{ marginTop: "8px" }}>
              <summary style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", cursor: "pointer" }}>Error details (for developers)</summary>
              <div style={{ marginTop: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "16px", fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)", overflowX: "auto" }}>
                <div>Name: <span style={{ color: "rgba(255,255,255,0.7)" }}>{error?.name}</span></div>
                <div style={{ marginTop: "4px" }}>Message: <span style={{ color: "rgba(255,255,255,0.7)" }}>{error?.message}</span></div>
                {error?.digest && <div style={{ marginTop: "4px" }}>Digest: <span style={{ color: "rgba(255,255,255,0.7)" }}>{error.digest}</span></div>}
                {error?.stack && <pre style={{ marginTop: "8px", color: "rgba(255,255,255,0.3)", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "10px" }}>{error.stack}</pre>}
              </div>
            </details>
          </div>
        </div>
      </body>
    </html>
  );
}
