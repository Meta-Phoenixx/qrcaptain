"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useState } from "react";

// ── Unauthenticated view ──────────────────────────────────────────────────────

function UnauthenticatedScanView({ code }: { code: string }) {
  const router = useRouter();
  const publicInfo = useQuery(api.vessels.getVesselPublicInfo, { qrCodeData: code });

  if (publicInfo === undefined) {
    return <ScanLoading />;
  }

  if (publicInfo === null) {
    return <ScanNotFound />;
  }

  const signInUrl = `/signin?redirect=/scan/${encodeURIComponent(code)}`;

  return (
    <div className="min-h-screen bg-[#0f1929] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-captain-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <span className="text-white font-heading font-bold text-xl">QR Captain</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-captain-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-captain-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-white font-heading font-bold text-xl mb-1">Login Required</h1>
          <p className="text-gray-400 text-sm mb-1">
            Sign in to view vessel information for
          </p>
          <p className="text-captain-400 font-semibold text-lg mb-1">
            {publicInfo.name}
          </p>
          {(publicInfo.year || publicInfo.make || publicInfo.model) && (
            <p className="text-gray-500 text-sm mb-4">
              {[publicInfo.year, publicInfo.make, publicInfo.model].filter(Boolean).join(" ")}
            </p>
          )}
          <p className="text-gray-500 text-xs mb-6">
            Owned by {publicInfo.ownerName}
          </p>

          <button
            onClick={() => router.push(signInUrl)}
            className="w-full py-3 rounded-xl bg-captain-500 hover:bg-captain-600 text-white font-semibold transition-colors"
          >
            Sign In to Continue
          </button>
          <p className="text-gray-600 text-xs mt-4">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push(`/signin?redirect=/scan/${encodeURIComponent(code)}`)}
              className="text-captain-400 hover:text-captain-300 underline"
            >
              Create one free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Authenticated view ────────────────────────────────────────────────────────

function AuthenticatedScanView({ code }: { code: string }) {
  const router = useRouter();
  const access = useQuery(api.vessels.checkVesselAccess, { qrCodeData: code });
  const requestAccess = useMutation(api.accessRequests.requestAccess);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  if (access === undefined) return <ScanLoading />;

  if (access.reason === "not_found") return <ScanNotFound />;

  // Has access — redirect to the vessel page
  if (access.canView && access.vessel) {
    router.replace(`/vessel/${access.vessel._id}`);
    return <ScanLoading />;
  }

  // Unauthorized — show request access UI
  const vessel = access.vessel!;
  const hasPendingRequest = (access as any).hasPendingRequest;

  const handleRequestAccess = async () => {
    setRequesting(true);
    setRequestError(null);
    try {
      await requestAccess({ vesselId: vessel._id as any, message: message || undefined });
      setRequested(true);
    } catch (err: any) {
      setRequestError(err?.message || "Failed to send request.");
    } finally {
      setRequesting(false);
    }
  };

  if (requested || hasPendingRequest) {
    return (
      <div className="min-h-screen bg-[#0f1929] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-white font-heading font-bold text-xl mb-2">Request Sent</h1>
            <p className="text-gray-400 text-sm mb-1">
              Your access request for <span className="text-white font-medium">{vessel.name}</span> has been sent to {vessel.ownerName}.
            </p>
            <p className="text-gray-500 text-xs mt-4">You&apos;ll be notified once the owner responds.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1929] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-captain-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <span className="text-white font-heading font-bold text-xl">QR Captain</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          <h1 className="text-white font-heading font-bold text-xl mb-1">Access Required</h1>
          <p className="text-gray-400 text-sm mb-1">You don&apos;t have permission to view</p>
          <p className="text-captain-400 font-semibold text-lg mb-1">{vessel.name}</p>
          {(vessel.year || vessel.make || vessel.model) && (
            <p className="text-gray-500 text-sm mb-2">
              {[vessel.year, vessel.make, vessel.model].filter(Boolean).join(" ")}
            </p>
          )}
          <p className="text-gray-500 text-xs mb-6">Owned by {vessel.ownerName}</p>

          <div className="text-left mb-4">
            <label className="block text-gray-400 text-xs mb-1.5">Message to owner (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, I'd like to request access to service this vessel..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-gray-600 resize-none focus:outline-none focus:border-captain-500"
            />
          </div>

          {requestError && (
            <p className="text-red-400 text-xs mb-3">{requestError}</p>
          )}

          <button
            onClick={handleRequestAccess}
            disabled={requesting}
            className="w-full py-3 rounded-xl bg-captain-500 hover:bg-captain-600 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {requesting ? "Sending..." : "Request Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ScanLoading() {
  return (
    <div className="min-h-screen bg-[#0f1929] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-captain-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ScanNotFound() {
  return (
    <div className="min-h-screen bg-[#0f1929] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-white font-heading font-bold text-xl mb-2">Vessel Not Found</h1>
        <p className="text-gray-400 text-sm">This QR code doesn&apos;t match any vessel in QR Captain.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);

  return (
    <>
      <AuthLoading>
        <ScanLoading />
      </AuthLoading>
      <Unauthenticated>
        <UnauthenticatedScanView code={code} />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedScanView code={code} />
      </Authenticated>
    </>
  );
}
