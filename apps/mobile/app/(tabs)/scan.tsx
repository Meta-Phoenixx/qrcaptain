import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Query vessel when we have a scanned code
  const vessel = useQuery(
    api.vessels.getVesselByQRCode,
    scannedCode ? { qrCodeData: scannedCode } : "skip"
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            QR Captain needs camera access to scan vessel QR codes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (data.startsWith("QRC-")) {
      setScannedCode(data);
    }
  };

  const closeModal = () => {
    setScannedCode(null);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scannedCode ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instructions}>
            Point camera at vessel QR code
          </Text>
        </View>
      </CameraView>

      {/* Vessel Modal */}
      <Modal
        visible={scannedCode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vessel Found</Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {vessel ? (
            <View style={styles.vesselInfo}>
              <Text style={styles.vesselName}>{vessel.name}</Text>
              <Text style={styles.vesselDetails}>
                {vessel.year} {vessel.make} {vessel.model}
              </Text>
              <Text style={styles.vesselOwner}>
                Owner: {vessel.ownerName}
              </Text>
              <Text style={styles.workOrderCount}>
                {vessel.workOrderCount} previous work orders
              </Text>

              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Work Order</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.historyButton}>
                <Text style={styles.historyButtonText}>View History</Text>
              </TouchableOpacity>
            </View>
          ) : scannedCode ? (
            <View style={styles.notFound}>
              <Text style={styles.notFoundText}>
                Vessel not found or you don't have access
              </Text>
              <TouchableOpacity
                style={styles.requestButton}
                onPress={closeModal}
              >
                <Text style={styles.requestButtonText}>Request Access</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  text: {
    color: "#fff",
    textAlign: "center",
    marginTop: 100,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#0284c7",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    color: "#fff",
    marginTop: 24,
    fontSize: 16,
  },
  permissionCard: {
    margin: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  permissionText: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modal: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  closeButton: {
    fontSize: 24,
    color: "#6b7280",
  },
  vesselInfo: {
    padding: 24,
  },
  vesselName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  vesselDetails: {
    fontSize: 18,
    color: "#4b5563",
    marginBottom: 8,
  },
  vesselOwner: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 4,
  },
  workOrderCount: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  historyButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0284c7",
  },
  historyButtonText: {
    color: "#0284c7",
    fontSize: 18,
    fontWeight: "600",
  },
  notFound: {
    padding: 24,
    alignItems: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  requestButton: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  requestButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
