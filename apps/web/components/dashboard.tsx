"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef, useCallback } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { ImageCropper } from "./image-cropper";
import { EquipmentManifest } from "./equipment-manifest";
import { QRCodeSVG } from "qrcode.react";
import { QRScanner, VesselInfoModal } from "./qr-scanner";

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
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Handle file selection - show cropper first
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a URL for the selected file to show in cropper
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  // Handle cropped image upload
  const handleCroppedImage = async (croppedBlob: Blob) => {
    setImageToCrop(null);
    setIsUploading(true);
    
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the cropped image
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
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

  // Cancel cropping
  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* QR Code Section */}
          <VesselQRCode 
            qrCodeData={vessel.qrCodeData} 
            vesselName={vessel.name}
          />

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

          {/* Equipment Manifest Section */}
          <EquipmentManifest vesselId={vesselId} />

          {/* Work Orders Section */}
          <div className="mt-6">
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

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={handleCropCancel}
          aspectRatio={16 / 9}
        />
      )}
    </div>
  );
}

// ============================================
// MECHANIC DASHBOARD
// ============================================

function MechanicDashboard() {
  const workOrders = useQuery(api.workOrders.getMyWorkOrders, {});
  const [showScanner, setShowScanner] = useState(false);
  const [scannedVessel, setScannedVessel] = useState<any>(null);

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
        <button 
          onClick={() => setShowScanner(true)}
          className="rounded-lg bg-captain-600 px-4 py-2 font-semibold text-white hover:bg-captain-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan QR Code
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

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onVesselFound={(vessel) => {
            setShowScanner(false);
            setScannedVessel(vessel);
          }}
        />
      )}

      {/* Scanned Vessel Info Modal */}
      {scannedVessel && (
        <VesselInfoModal
          vessel={scannedVessel}
          onClose={() => setScannedVessel(null)}
          onStartWorkOrder={() => {
            // TODO: Navigate to create work order page
            alert("Work order creation will be implemented in the next update!");
            setScannedVessel(null);
          }}
          onViewHistory={() => {
            // TODO: Navigate to vessel history page
            alert("Vessel history view will be implemented in the next update!");
            setScannedVessel(null);
          }}
        />
      )}
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

// ============================================
// VESSEL QR CODE COMPONENT
// ============================================

function VesselQRCode({ qrCodeData, vesselName }: { qrCodeData: string; vesselName: string }) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Download QR code as PNG
  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with padding for label
    const qrSize = 256;
    const padding = 32;
    const labelHeight = 60;
    canvas.width = qrSize + padding * 2;
    canvas.height = qrSize + padding * 2 + labelHeight;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      // Add vessel name label
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(vesselName, canvas.width / 2, qrSize + padding + 30);

      // Add QR code ID
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px monospace";
      ctx.fillText(qrCodeData, canvas.width / 2, qrSize + padding + 50);

      // Download
      const link = document.createElement("a");
      link.download = `${vesselName.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [qrCodeData, vesselName]);

  // Print QR code
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${vesselName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              background: white;
            }
            .qr-code {
              width: 200px;
              height: 200px;
              margin-bottom: 20px;
            }
            h2 {
              margin: 0 0 8px 0;
              color: #1f2937;
              font-size: 24px;
            }
            .code-id {
              font-family: monospace;
              color: #6b7280;
              font-size: 14px;
            }
            .instructions {
              margin-top: 16px;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .qr-container {
                border: 1px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">
              ${qrRef.current?.innerHTML || ""}
            </div>
            <h2>⚓ ${vesselName}</h2>
            <div class="code-id">${qrCodeData}</div>
            <div class="instructions">Scan with QR Captain app to access vessel service history</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [qrCodeData, vesselName]);

  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-captain-50 to-captain-100 rounded-xl">
      <div className="text-center">
        {/* QR Code */}
        <div 
          ref={qrRef}
          className="inline-block p-4 bg-white rounded-xl shadow-sm mb-3"
        >
          <QRCodeSVG
            value={qrCodeData}
            size={160}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0c4a6e"
          />
        </div>
        
        <p className="text-sm text-gray-600 mb-1">
          Scan this QR code to access vessel history
        </p>
        <p className="text-xs text-captain-600 font-mono mb-4">
          {qrCodeData}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-captain-700 bg-white border border-captain-200 rounded-lg hover:bg-captain-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
