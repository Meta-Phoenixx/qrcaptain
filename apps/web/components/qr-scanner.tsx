"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface QRScannerProps {
  onClose: () => void;
  onVesselFound: (vessel: any) => void;
}

export function QRScanner({ onClose, onVesselFound }: QRScannerProps) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Query vessel when we have a scanned code
  const vessel = useQuery(
    api.vessels.getVesselByQRCode,
    scannedCode ? { qrCodeData: scannedCode } : "skip"
  );

  // Handle vessel found
  useEffect(() => {
    if (vessel && scannedCode) {
      onVesselFound(vessel);
    } else if (vessel === null && scannedCode) {
      setError("Vessel not found. Please check the QR code.");
      setScannedCode(null);
    }
  }, [vessel, scannedCode, onVesselFound]);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize camera scanner
  useEffect(() => {
    if (mode !== "camera" || !scannerRef.current) return;

    let html5QrCode: any = null;
    let isCleanedUp = false;

    const initScanner = async () => {
      try {
        // Dynamically import html5-qrcode to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");
        
        // Check if cleanup was called before init completed
        if (isCleanedUp || !isMountedRef.current) return;
        
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            // Validate QR code format
            if (decodedText.startsWith("QRC-")) {
              setScannedCode(decodedText);
              setError(null);
              // Stop scanner after successful scan
              html5QrCode.stop().catch(console.error);
            } else {
              setError("Invalid QR code. Please scan a QR Captain vessel code.");
            }
          },
          () => {} // Ignore scan errors (no QR detected)
        );

        if (isMountedRef.current && !isCleanedUp) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err) {
        console.error("Failed to start scanner:", err);
        if (isMountedRef.current && !isCleanedUp) {
          setCameraError(
            err instanceof Error
              ? err.message.includes("Permission")
                ? "Camera permission denied. Please allow camera access or enter the code manually."
                : "Failed to start camera. Try entering the code manually."
              : "Camera not available"
          );
          setIsScanning(false);
        }
      }
    };

    initScanner();

    // Cleanup function - must run synchronously before React unmounts
    return () => {
      isCleanedUp = true;
      
      // Clear the scanner element first to prevent React DOM conflicts
      // This must happen synchronously before React's unmount
      const element = document.getElementById("qr-reader");
      if (element) {
        element.innerHTML = "";
      }
      
      // Stop the scanner (fire and forget - the DOM is already cleared)
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        
        // Stop scanner in background - DOM is already safe
        try {
          const state = scanner.getState?.();
          if (state === 2 || scanner.isScanning) {
            scanner.stop().catch(() => {
              // Ignore errors - element already cleared
            });
          }
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, [mode]);

  // Handle manual code submission
  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const code = manualCode.trim().toUpperCase();
      if (!code) {
        setError("Please enter a QR code");
        return;
      }

      if (!code.startsWith("QRC-")) {
        setError("Invalid code format. QR Captain codes start with 'QRC-'");
        return;
      }

      setScannedCode(code);
    },
    [manualCode]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-captain-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Scan Vessel QR Code</h2>
              <p className="text-sm text-captain-100">
                Access vessel service history
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-captain-500 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              mode === "camera"
                ? "text-captain-600 border-b-2 border-captain-600 bg-captain-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Camera
            </span>
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              mode === "manual"
                ? "text-captain-600 border-b-2 border-captain-600 bg-captain-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Enter Code
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === "camera" ? (
            <div className="space-y-4">
              {/* Camera View - wrapper contains the scanner and overlay separately */}
              <div className="relative rounded-xl overflow-hidden bg-gray-900 min-h-[280px]">
                {/* Scanner container - NO React children inside to avoid DOM conflicts */}
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="w-full min-h-[280px]"
                />
                {/* Overlay states - positioned over scanner but NOT inside qr-reader */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <p className="text-white text-sm mb-4">{cameraError}</p>
                      <button
                        onClick={() => setMode("manual")}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        Enter Code Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Scanning indicator */}
              {isScanning && !scannedCode && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Position the QR code in the frame
                </div>
              )}

              {/* Loading indicator when code is scanned */}
              {scannedCode && !vessel && !error && (
                <div className="flex items-center justify-center gap-2 text-sm text-captain-600">
                  <div className="w-4 h-4 border-2 border-captain-600 border-t-transparent rounded-full animate-spin"></div>
                  Looking up vessel...
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter QR Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="QRC-XXXXXXXXX-XXXXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-captain-500 focus:outline-none focus:ring-2 focus:ring-captain-500/20 font-mono text-center uppercase"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  The code is printed below the QR code on the vessel
                </p>
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Look Up Vessel
              </button>
            </form>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setScannedCode(null);
                    setManualCode("");
                  }}
                  className="text-sm text-red-600 hover:text-red-800 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Vessel Info Modal Component - shown after successful scan
interface VesselInfoModalProps {
  vessel: {
    _id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    vesselType: string;
    ownerName?: string;
    ownerEmail?: string;
    workOrderCount: number;
    qrCodeData: string;
  };
  onClose: () => void;
  onStartWorkOrder: () => void;
  onViewHistory: () => void;
}

export function VesselInfoModal({
  vessel,
  onClose,
  onStartWorkOrder,
  onViewHistory,
}: VesselInfoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-captain-600 to-captain-700 px-6 py-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⚓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{vessel.name}</h2>
                <p className="text-captain-100">
                  {vessel.year} {vessel.make} {vessel.model}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Vessel Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="font-semibold text-gray-900 capitalize">
                {vessel.vesselType.replace("_", " ")}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Service Records</p>
              <p className="font-semibold text-gray-900">
                {vessel.workOrderCount} {vessel.workOrderCount === 1 ? "record" : "records"}
              </p>
            </div>
          </div>

          {/* Owner Info */}
          {vessel.ownerName && (
            <div className="bg-captain-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-captain-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-captain-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-captain-600">Owner</p>
                <p className="font-semibold text-gray-900">{vessel.ownerName}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onStartWorkOrder}
              className="w-full py-3.5 bg-captain-600 text-white rounded-xl font-semibold hover:bg-captain-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Start Work Order
            </button>
            <button
              onClick={onViewHistory}
              className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View Service History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
