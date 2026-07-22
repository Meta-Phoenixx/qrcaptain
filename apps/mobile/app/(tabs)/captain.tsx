import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import * as Location from "expo-location";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";

const COLORS = {
  sky: "#0284c7",
  skyDark: "#0c4a6e",
  skyLight: "#e0f2fe",
  bg: "#f0f9ff",
  white: "#fff",
  gray: "#6b7280",
  grayLight: "#f3f4f6",
  red: "#ef4444",
  redLight: "#fef2f2",
  redDark: "#991b1b",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  green: "#10b981",
};

async function getGPS(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Assignment = { vesselId: any; vesselName: string };

function VesselPicker({
  assignments,
  selected,
  onSelect,
}: {
  assignments: Assignment[];
  selected: Assignment | null;
  onSelect: (a: Assignment) => void;
}) {
  if (assignments.length === 0) return null;
  if (assignments.length === 1) return null; // auto-selected below

  return (
    <View style={styles.pickerRow}>
      {assignments.map((a) => (
        <TouchableOpacity
          key={a.vesselId}
          onPress={() => onSelect(a)}
          style={[styles.pill, selected?.vesselId === a.vesselId && styles.pillActive]}
        >
          <Text style={[styles.pillText, selected?.vesselId === a.vesselId && styles.pillTextActive]}>
            {a.vesselName}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DistressModal({
  visible,
  onConfirm,
  onCancel,
  submitting,
}: {
  visible: boolean;
  onConfirm: (msg: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [msg, setMsg] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.distressModal}>
          <Text style={styles.distressTitle}>🚨 Send Distress Notice</Text>
          <Text style={styles.distressSubtitle}>
            This will immediately alert your fleet owner and all assigned mechanics with your GPS location.
          </Text>
          <TextInput
            style={styles.distressInput}
            value={msg}
            onChangeText={setMsg}
            placeholder="Describe the emergency (e.g. engine failure, fire, man overboard)…"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <View style={styles.distressActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.distressBtn, (!msg.trim() || submitting) && styles.btnDisabled]}
              onPress={() => msg.trim() && onConfirm(msg.trim())}
              disabled={!msg.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={styles.distressBtnText}>Send Alert</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CaptainScreen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = api as any;
  const assignments: Assignment[] | undefined = useQuery(a.captains.listMyAssignments);
  const fileReport = useMutation(a.captains.filePostTripReport);
  const sendDistress = useMutation(a.captains.sendDistressNotice);

  const [selected, setSelected] = useState<Assignment | null>(null);
  const [reportMsg, setReportMsg] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showDistress, setShowDistress] = useState(false);
  const [submittingDistress, setSubmittingDistress] = useState(false);

  if (assignments === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.sky} />
      </View>
    );
  }

  // Auto-select only vessel
  const activeSelected = selected ?? (assignments.length === 1 ? assignments[0] : null);

  if (assignments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🚤</Text>
        <Text style={styles.emptyTitle}>No Vessels Assigned</Text>
        <Text style={styles.emptyText}>Your fleet manager needs to assign you to a vessel before you can file reports or send alerts.</Text>
      </View>
    );
  }

  const handleFileReport = async () => {
    if (!activeSelected || !reportMsg.trim()) return;
    setSubmittingReport(true);
    try {
      const gps = await getGPS();
      await fileReport({
        vesselId: activeSelected.vesselId,
        message: reportMsg.trim(),
        gpsLat: gps?.lat,
        gpsLng: gps?.lng,
      });
      setReportMsg("");
      Alert.alert("Report Filed", "Your post-trip note has been sent to the fleet manager and mechanic.");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to file report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDistress = async (message: string) => {
    if (!activeSelected) return;
    setSubmittingDistress(true);
    try {
      const gps = await getGPS();
      await sendDistress({
        vesselId: activeSelected.vesselId,
        message,
        gpsLat: gps?.lat,
        gpsLng: gps?.lng,
      });
      setShowDistress(false);
      Alert.alert("Distress Sent", "Your fleet manager and all mechanics have been alerted with your GPS location.");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send distress");
    } finally {
      setSubmittingDistress(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Vessel selector */}
        {assignments.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Vessel</Text>
            <VesselPicker
              assignments={assignments}
              selected={activeSelected}
              onSelect={setSelected}
            />
          </View>
        )}

        {activeSelected && (
          <View style={styles.vesselHeader}>
            <Text style={styles.vesselName}>{activeSelected.vesselName}</Text>
          </View>
        )}

        {/* 🚨 Distress button — always prominent */}
        <TouchableOpacity
          style={[styles.distressCallout, !activeSelected && styles.btnDisabled]}
          onPress={() => activeSelected && setShowDistress(true)}
          disabled={!activeSelected}
          activeOpacity={0.85}
        >
          <Text style={styles.distressCalloutIcon}>🚨</Text>
          <View>
            <Text style={styles.distressCalloutTitle}>Send Distress Notice</Text>
            <Text style={styles.distressCalloutSub}>
              Immediately alerts fleet owner + mechanics with your GPS
            </Text>
          </View>
        </TouchableOpacity>

        {/* Post-trip report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post-Trip Note</Text>
          <Text style={styles.sectionDesc}>
            Log anything that happened on this trip — mechanical issues, unusual sounds, concerns. Your mechanic will be notified.
          </Text>
          <TextInput
            style={styles.textarea}
            value={reportMsg}
            onChangeText={setReportMsg}
            placeholder="e.g. Port engine running rough at low RPM, starboard trim tab slow to respond…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{reportMsg.length}/1000</Text>

          <TouchableOpacity
            style={[styles.submitBtn, (!activeSelected || !reportMsg.trim() || submittingReport) && styles.btnDisabled]}
            onPress={handleFileReport}
            disabled={!activeSelected || !reportMsg.trim() || submittingReport}
          >
            {submittingReport
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.submitBtnText}>Submit Trip Note</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DistressModal
        visible={showDistress}
        onConfirm={handleDistress}
        onCancel={() => setShowDistress(false)}
        submitting={submittingDistress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 16, paddingBottom: 40 },
  loading:   { flex: 1, justifyContent: "center", alignItems: "center" },
  empty:     { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyEmoji:  { fontSize: 56, marginBottom: 12 },
  emptyTitle:  { fontSize: 20, fontWeight: "700", color: COLORS.skyDark, marginBottom: 8 },
  emptyText:   { color: COLORS.gray, textAlign: "center", lineHeight: 20 },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.skyDark, marginBottom: 6 },
  sectionDesc:  { fontSize: 13, color: COLORS.gray, marginBottom: 12, lineHeight: 18 },

  pickerRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#e5e7eb" },
  pillActive:      { backgroundColor: COLORS.sky, borderColor: COLORS.sky },
  pillText:        { fontSize: 13, fontWeight: "600", color: COLORS.gray },
  pillTextActive:  { color: COLORS.white },

  vesselHeader: { marginBottom: 16 },
  vesselName:   { fontSize: 20, fontWeight: "700", color: COLORS.skyDark },

  distressCallout: {
    backgroundColor: COLORS.red,
    borderRadius: 16, padding: 20, marginBottom: 24,
    flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  distressCalloutIcon:  { fontSize: 36 },
  distressCalloutTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  distressCalloutSub:   { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  textarea: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: "#1f2937", minHeight: 120,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  charCount: { fontSize: 11, color: COLORS.gray, textAlign: "right", marginTop: 4 },

  submitBtn: {
    backgroundColor: COLORS.sky, borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 12,
    shadowColor: COLORS.sky, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  btnDisabled:   { opacity: 0.5 },

  // Distress modal
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  distressModal: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: "100%",
  },
  distressTitle:    { fontSize: 20, fontWeight: "700", color: COLORS.red, marginBottom: 8 },
  distressSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 16, lineHeight: 18 },
  distressInput:    {
    backgroundColor: COLORS.grayLight, borderRadius: 10, padding: 14,
    fontSize: 14, color: "#1f2937", minHeight: 90, borderWidth: 1, borderColor: "#e5e7eb",
    textAlignVertical: "top",
  },
  distressActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center",
  },
  cancelBtnText:   { fontSize: 15, fontWeight: "600", color: COLORS.gray },
  distressBtn:     { flex: 2, backgroundColor: COLORS.red, borderRadius: 10, padding: 14, alignItems: "center" },
  distressBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.white },
});
