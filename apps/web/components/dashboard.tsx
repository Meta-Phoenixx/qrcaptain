"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-captain-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-captain-900">⚓ QR Captain</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.fullName} ({user.role})
            </span>
            <button
              onClick={() => signOut()}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {user.role === "owner" && <OwnerDashboard />}
        {user.role === "mechanic" && <MechanicDashboard />}
        {user.role === "admin" && <AdminDashboard />}
      </main>
    </div>
  );
}

function OwnerDashboard() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">My Vessels</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">
          No vessels yet. Add your first vessel to get started.
        </p>
        <button className="mt-4 rounded-lg bg-captain-600 px-6 py-3 font-semibold text-white hover:bg-captain-700">
          + Add Vessel
        </button>
      </div>
    </div>
  );
}

function MechanicDashboard() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Active Work Orders
      </h2>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">
          No active work orders. Scan a vessel QR code to start.
        </p>
        <button className="mt-4 rounded-lg bg-captain-600 px-6 py-3 font-semibold text-white hover:bg-captain-700">
          📷 Scan QR Code
        </button>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Admin Dashboard
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">--</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Vessels</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">--</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Work Orders</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">--</p>
        </div>
      </div>
    </div>
  );
}
