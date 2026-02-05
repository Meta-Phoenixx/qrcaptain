"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ManifestViewer } from "./manifest-viewer";
import { ServiceHistoryViewer } from "./service-history-viewer";
import { WorkOrderForm } from "./work-order-form";
import { WorkOrderEditor } from "./work-order-editor";

interface AuthorizedVesselsProps {
  onSelectVessel: (vessel: any) => void;
}

// Tooltip component
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

export function AuthorizedVessels({ onSelectVessel }: AuthorizedVesselsProps) {
  const authorizedVessels = useQuery(api.vessels.getAuthorizedVessels);
  const [manifestVessel, setManifestVessel] = useState<{ _id: Id<"vessels">; name: string } | null>(null);
  const [historyVessel, setHistoryVessel] = useState<{ _id: Id<"vessels">; name: string } | null>(null);
  const [workOrderFormVessel, setWorkOrderFormVessel] = useState<{ _id: Id<"vessels">; name: string } | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<Id<"workOrders"> | null>(null);

  if (authorizedVessels === undefined) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Authorized Vessels
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (authorizedVessels.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Authorized Vessels
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">No authorized vessels yet</p>
          <p className="text-sm text-gray-500">
            Scan a vessel's QR code to request access from the owner.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Authorized Vessels
        <span className="text-sm font-normal text-gray-500">({authorizedVessels.length})</span>
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {authorizedVessels.filter((v): v is NonNullable<typeof v> => v !== null).map((vessel) => (
          <div
            key={vessel._id}
            onClick={() => onSelectVessel(vessel)}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-captain-300 hover:shadow-lg transition-all cursor-pointer group"
          >
            {/* Vessel Image or Placeholder */}
            <div className="h-32 bg-gradient-to-br from-captain-100 to-captain-200 relative">
              {vessel.imageUrl ? (
                <img
                  src={vessel.imageUrl}
                  alt={vessel.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl opacity-50">⚓</span>
                </div>
              )}
              {/* Active work order badge */}
              {vessel.stats.activeWorkOrders > 0 && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {vessel.stats.activeWorkOrders} Active
                </div>
              )}
            </div>

            {/* Vessel Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-captain-600 transition-colors">
                    {vessel.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {vessel.year} {vessel.make} {vessel.model}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Authorized
                </span>
              </div>

              {/* Owner Info Card */}
              {vessel.owner && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-captain-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-captain-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {vessel.owner.name}
                      </p>
                      {vessel.owner.email && (
                        <p className="text-xs text-gray-500 truncate">
                          {vessel.owner.email}
                        </p>
                      )}
                      {vessel.owner.phone && (
                        <p className="text-xs text-gray-500">
                          {vessel.owner.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{vessel.stats.totalWorkOrders} orders</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Since {formatDate(vessel.authorization.authorizedAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setWorkOrderFormVessel({ _id: vessel._id, name: vessel.name });
                }}
                className="flex-1 py-2 bg-captain-600 text-white text-sm font-medium rounded-lg hover:bg-captain-700 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Work Order
              </button>
              
              {/* Equipment Manifest Button */}
              <Tooltip text="View Equipment Manifest">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setManifestVessel({ _id: vessel._id, name: vessel.name });
                  }}
                  className="py-2 px-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-captain-300 hover:text-captain-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </button>
              </Tooltip>

              {/* Service History Button */}
              <Tooltip text="View Service History">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryVessel({ _id: vessel._id, name: vessel.name });
                  }}
                  className="py-2 px-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-captain-300 hover:text-captain-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      {/* Manifest Viewer Modal */}
      {manifestVessel && (
        <ManifestViewer
          vesselId={manifestVessel._id}
          vesselName={manifestVessel.name}
          onClose={() => setManifestVessel(null)}
        />
      )}

      {/* Service History Viewer Modal */}
      {historyVessel && (
        <ServiceHistoryViewer
          vesselId={historyVessel._id}
          vesselName={historyVessel.name}
          onClose={() => setHistoryVessel(null)}
        />
      )}

      {/* Work Order Form Modal */}
      {workOrderFormVessel && (
        <WorkOrderForm
          vesselId={workOrderFormVessel._id}
          vesselName={workOrderFormVessel.name}
          onSuccess={(workOrderId) => {
            setWorkOrderFormVessel(null);
            setEditingWorkOrderId(workOrderId);
          }}
          onCancel={() => setWorkOrderFormVessel(null)}
        />
      )}

      {/* Work Order Editor Modal */}
      {editingWorkOrderId && (
        <WorkOrderEditor
          workOrderId={editingWorkOrderId}
          onClose={() => setEditingWorkOrderId(null)}
          onCompleted={() => setEditingWorkOrderId(null)}
        />
      )}
    </div>
  );
}

export default AuthorizedVessels;
