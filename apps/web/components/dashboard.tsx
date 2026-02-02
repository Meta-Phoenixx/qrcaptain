"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef } from "react";
import { Id } from "../../../convex/_generated/dataModel";

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
              {user.fullName || user.name} ({user.role})
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

// ============================================
// OWNER DASHBOARD
// ============================================

function OwnerDashboard() {
  const vessels = useQuery(api.vessels.listMyVessels) ?? [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<Id<"vessels"> | null>(null);

  if (vessels === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">My Vessels</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-captain-600 px-4 py-2 font-semibold text-white hover:bg-captain-700"
        >
          + Add Vessel
        </button>
      </div>

      {vessels.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="text-5xl mb-4">🚤</div>
          <p className="text-gray-500 mb-4">
            No vessels yet. Add your first vessel to get started.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-captain-600 px-6 py-3 font-semibold text-white hover:bg-captain-700"
          >
            + Add Your First Vessel
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vessels.map((vessel) => (
            <div 
              key={vessel._id} 
              className="rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer hover:border-captain-300 hover:shadow-md transition-all"
              onClick={() => setSelectedVessel(vessel._id)}
            >
              {/* Vessel Photo */}
              {vessel.imageUrl ? (
                <div className="h-32 overflow-hidden">
                  <img 
                    src={vessel.imageUrl} 
                    alt={vessel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-captain-100 to-captain-200 flex items-center justify-center">
                  <span className="text-5xl opacity-50">🚤</span>
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{vessel.name}</h3>
                    <p className="text-sm text-gray-500">{vessel.make} {vessel.model}</p>
                    <p className="text-sm text-gray-400">{vessel.year} • {vessel.vesselType}</p>
                  </div>
                  <span className="text-xl">⚓</span>
                </div>
                {vessel.registrationNumber && (
                  <p className="mt-2 text-xs text-gray-400">
                    Reg: {vessel.registrationNumber}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vessel Modal */}
      {showAddModal && (
        <AddVesselModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Vessel Detail Modal */}
      {selectedVessel && (
        <VesselDetailModal 
          vesselId={selectedVessel} 
          onClose={() => setSelectedVessel(null)} 
        />
      )}
    </div>
  );
}

function AddVesselModal({ onClose }: { onClose: () => void }) {
  const createVessel = useMutation(api.vessels.createVessel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      await createVessel({
        name: formData.get("name") as string,
        make: formData.get("make") as string,
        model: formData.get("model") as string,
        year: parseInt(formData.get("year") as string),
        vesselType: formData.get("vesselType") as string,
        registrationNumber: formData.get("registrationNumber") as string || undefined,
        hullId: formData.get("hullId") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vessel");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Add New Vessel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vessel Name *
            </label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              placeholder="e.g., Sea Breeze"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make *
              </label>
              <input
                name="make"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="e.g., Boston Whaler"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <input
                name="model"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="e.g., Outrage 330"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year *
              </label>
              <input
                name="year"
                type="number"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="2023"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vessel Type *
              </label>
              <select
                name="vesselType"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              >
                <option value="powerboat">Powerboat</option>
                <option value="sailboat">Sailboat</option>
                <option value="yacht">Yacht</option>
                <option value="fishing">Fishing Boat</option>
                <option value="pontoon">Pontoon</option>
                <option value="jet_ski">Jet Ski / PWC</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                name="registrationNumber"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="FL 1234 AB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hull ID (HIN)
              </label>
              <input
                name="hullId"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
                placeholder="ABC12345D678"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20"
              placeholder="Any additional information about your vessel..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-captain-600 px-4 py-2 font-semibold text-white hover:bg-captain-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Vessel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VesselDetailModal({ vesselId, onClose }: { vesselId: Id<"vessels">; onClose: () => void }) {
  const vessel = useQuery(api.vessels.getVessel, { vesselId });
  const workOrders = useQuery(api.workOrders.getVesselWorkOrders, { vesselId });
  const vesselImageUrl = useQuery(api.storage.getVesselImageUrl, { vesselId });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveVesselImage = useMutation(api.storage.saveVesselImage);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      const { storageId } = await result.json();
      
      // Save to vessel
      await saveVesselImage({ vesselId, storageId });
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (vessel === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
        </div>
      </div>
    );
  }

  if (!vessel) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{vessel.name}</h2>
            <p className="text-sm text-gray-500">{vessel.make} {vessel.model} ({vessel.year})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Vessel Photo Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Vessel Photo</h3>
            <div className="relative">
              {vesselImageUrl ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img 
                    src={vesselImageUrl} 
                    alt={vessel.name}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white shadow-sm"
                  >
                    {isUploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-captain-400 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600 mb-2"></div>
                      <p className="text-sm text-gray-500">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl mb-2">📷</span>
                      <p className="text-sm text-gray-500">Click to upload a photo of your vessel</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* QR Code Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center">
            <div className="inline-block p-4 bg-white rounded-lg shadow-sm mb-3">
              {/* QR Code placeholder - will be replaced with actual QR code */}
              <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-gray-400">
                <span className="text-4xl">📱</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Scan this QR code to access vessel history
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {vessel.qrCodeData}
            </p>
          </div>

          {/* Vessel Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-sm text-gray-500">Type</span>
              <p className="font-medium text-gray-900 capitalize">{vessel.vesselType.replace('_', ' ')}</p>
            </div>
            {vessel.registrationNumber && (
              <div>
                <span className="text-sm text-gray-500">Registration</span>
                <p className="font-medium text-gray-900">{vessel.registrationNumber}</p>
              </div>
            )}
            {vessel.hullId && (
              <div>
                <span className="text-sm text-gray-500">Hull ID</span>
                <p className="font-medium text-gray-900">{vessel.hullId}</p>
              </div>
            )}
          </div>

          {vessel.notes && (
            <div className="mb-6">
              <span className="text-sm text-gray-500">Notes</span>
              <p className="text-gray-700">{vessel.notes}</p>
            </div>
          )}

          {/* Work Orders Section */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Service History</h3>
            {workOrders === undefined ? (
              <div className="text-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-captain-200 border-t-captain-600 mx-auto"></div>
              </div>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No service history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.map((order) => (
                  <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{order.description}</p>
                        <p className="text-sm text-gray-500">
                          {order.mechanicName || "Unknown mechanic"} • {new Date(order.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MECHANIC DASHBOARD
// ============================================

function MechanicDashboard() {
  const workOrders = useQuery(api.workOrders.getMyWorkOrders, {});

  if (workOrders === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-captain-200 border-t-captain-600"></div>
      </div>
    );
  }

  const activeOrders = workOrders.filter(o => o.status === 'in_progress');
  const completedOrders = workOrders.filter(o => o.status === 'completed');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">My Work Orders</h2>
        <button className="rounded-lg bg-captain-600 px-4 py-2 font-semibold text-white hover:bg-captain-700">
          📷 Scan QR Code
        </button>
      </div>

      {/* Active Work Orders */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          Active ({activeOrders.length})
        </h3>
        {activeOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">No active work orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div key={order._id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-captain-300 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.vesselName}</p>
                    <p className="text-sm text-gray-600">{order.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Started {new Date(order.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    In Progress
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Work Orders */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          Completed ({completedOrders.length})
        </h3>
        {completedOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">No completed work orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((order) => (
              <div key={order._id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.vesselName}</p>
                    <p className="text-sm text-gray-600">{order.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Completed {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================

function AdminDashboard() {
  const stats = useQuery(api.vessels.getAdminStats);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Admin Dashboard
      </h2>
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">
            {stats?.userCount ?? "--"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Vessels</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">
            {stats?.vesselCount ?? "--"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Work Orders</h3>
          <p className="mt-2 text-3xl font-bold text-captain-600">
            {stats?.workOrderCount ?? "--"}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-center py-8">
          Activity feed coming soon...
        </p>
      </div>
    </div>
  );
}
