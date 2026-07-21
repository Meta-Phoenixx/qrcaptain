import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
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
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  green: "#10b981",
  greenLight: "#f0fdf4",
};

function HealthRing({ score }: { score: number }) {
  const color = score >= 80 ? COLORS.green : score >= 60 ? COLORS.amber : COLORS.red;
  return (
    <View style={styles.healthRing}>
      <View style={[styles.healthCircle, { borderColor: color }]}>
        <Text style={[styles.healthScore, { color }]}>{score}%</Text>
        <Text style={styles.healthLabel}>Fleet Health</Text>
      </View>
    </View>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function AlertBanner({ message, severity }: { message: string; severity: "red" | "amber" }) {
  const bg = severity === "red" ? COLORS.redLight : COLORS.amberLight;
  const textColor = severity === "red" ? COLORS.red : COLORS.amber;
  return (
    <View style={[styles.alertBanner, { backgroundColor: bg }]}>
      <Text style={[styles.alertText, { color: textColor }]}>{message}</Text>
    </View>
  );
}

function VesselStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    in_service:     { label: "In Service",     bg: COLORS.greenLight, color: COLORS.green },
    in_maintenance: { label: "In Maintenance", bg: COLORS.amberLight, color: COLORS.amber },
    out_of_service: { label: "Out of Service", bg: COLORS.redLight,   color: COLORS.red },
    storage:        { label: "Storage",        bg: COLORS.grayLight,  color: COLORS.gray },
  };
  const entry = map[status] ?? { label: status, bg: COLORS.grayLight, color: COLORS.gray };
  return (
    <View style={[styles.statusBadge, { backgroundColor: entry.bg }]}>
      <Text style={[styles.statusBadgeText, { color: entry.color }]}>{entry.label}</Text>
    </View>
  );
}

function ServiceBadge({ isOverdue, isApproaching }: { isOverdue: boolean; isApproaching: boolean }) {
  if (isOverdue) return (
    <View style={[styles.statusBadge, { backgroundColor: COLORS.redLight }]}>
      <Text style={[styles.statusBadgeText, { color: COLORS.red }]}>Overdue</Text>
    </View>
  );
  if (isApproaching) return (
    <View style={[styles.statusBadge, { backgroundColor: COLORS.amberLight }]}>
      <Text style={[styles.statusBadgeText, { color: COLORS.amber }]}>Due Soon</Text>
    </View>
  );
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FleetItem = { _id: any; name: string; vesselCount: number };

export default function FleetScreen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = api as any;
  const fleetList: FleetItem[] | undefined = useQuery(a.fleetDashboard.listAllFleetsDashboard);
  const selectedFleet = fleetList?.[0] ?? null;
  const dashboard = useQuery(
    a.fleetDashboard.getFleetDashboard,
    selectedFleet ? { fleetId: selectedFleet._id } : "skip"
  );

  if (fleetList === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.sky} />
      </View>
    );
  }

  if (fleetList.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>⚓</Text>
        <Text style={styles.emptyTitle}>No Fleets Yet</Text>
        <Text style={styles.emptyText}>Create a fleet from the web app to get started.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Fleet tabs (if multiple fleets, show name of first) */}
      {fleetList.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetTabs}>
          {fleetList.map((f) => (
            <View key={f._id} style={[styles.fleetTab, f._id === selectedFleet?._id && styles.fleetTabActive]}>
              <Text style={[styles.fleetTabText, f._id === selectedFleet?._id && styles.fleetTabTextActive]}>
                {f.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {!dashboard ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.sky} />
      ) : (
        <>
          {/* Health + status counts */}
          <View style={styles.topCard}>
            <HealthRing score={dashboard.healthScore} />
            <View style={styles.statList}>
              <StatRow label="In Service"     value={dashboard.inServiceCount}     color={COLORS.green} />
              <StatRow label="In Maintenance" value={dashboard.inMaintenanceCount} color={COLORS.amber} />
              <StatRow label="Out of Service" value={dashboard.outOfServiceCount}  color={COLORS.red} />
              <StatRow label="Storage"        value={dashboard.storageCount}       color={COLORS.gray} />
            </View>
          </View>

          {/* Alert banners */}
          {dashboard.overdueCount > 0 && (
            <AlertBanner message={`${dashboard.overdueCount} vessel${dashboard.overdueCount > 1 ? "s" : ""} overdue for service`} severity="red" />
          )}
          {dashboard.insuranceMissing > 0 && (
            <AlertBanner message={`${dashboard.insuranceMissing} vessel${dashboard.insuranceMissing > 1 ? "s" : ""} missing insurance`} severity="amber" />
          )}

          {/* Summary tiles */}
          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, dashboard.totalOpenWorkOrders > 0 && { color: COLORS.sky }]}>
                {dashboard.totalOpenWorkOrders}
              </Text>
              <Text style={styles.tileLabel}>Open Work Orders</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, dashboard.approachingCount > 0 && { color: COLORS.amber }]}>
                {dashboard.approachingCount}
              </Text>
              <Text style={styles.tileLabel}>Service Approaching</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, dashboard.uncoveredVessels > 0 && { color: COLORS.red }]}>
                {dashboard.uncoveredVessels}
              </Text>
              <Text style={styles.tileLabel}>Uncovered</Text>
            </View>
          </View>

          {/* Vessel list */}
          <Text style={styles.sectionTitle}>Vessel Roster</Text>
          {dashboard.vessels.map((v: any) => (
            <View key={v.vesselId} style={styles.vesselCard}>
              <View style={styles.vesselCardHeader}>
                <Text style={styles.vesselName}>{v.name}</Text>
                <VesselStatusBadge status={v.status} />
              </View>
              {(v.make || v.model) && (
                <Text style={styles.vesselMeta}>{[v.make, v.model].filter(Boolean).join(" ")}</Text>
              )}
              <View style={styles.vesselBadgeRow}>
                <ServiceBadge isOverdue={v.isOverdue} isApproaching={v.isApproaching} />
                {!v.hasInsurance && (
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.redLight }]}>
                    <Text style={[styles.statusBadgeText, { color: COLORS.red }]}>No Insurance</Text>
                  </View>
                )}
                {!v.hasMechanic && (
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.amberLight }]}>
                    <Text style={[styles.statusBadgeText, { color: COLORS.amber }]}>No Mechanic</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 16, paddingBottom: 32 },
  loading:     { flex: 1, justifyContent: "center", alignItems: "center" },
  empty:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyEmoji:  { fontSize: 56, marginBottom: 12 },
  emptyTitle:  { fontSize: 20, fontWeight: "700", color: COLORS.skyDark, marginBottom: 8 },
  emptyText:   { color: COLORS.gray, textAlign: "center" },

  fleetTabs: { marginBottom: 12 },
  fleetTab: {
    paddingHorizontal: 16, paddingVertical: 8, marginRight: 8,
    borderRadius: 20, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  fleetTabActive: { backgroundColor: COLORS.sky, borderColor: COLORS.sky },
  fleetTabText: { fontSize: 13, fontWeight: "600", color: COLORS.gray },
  fleetTabTextActive: { color: COLORS.white },

  topCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 20,
    marginBottom: 12, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  healthRing: { marginRight: 20 },
  healthCircle: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 6,
    justifyContent: "center", alignItems: "center",
  },
  healthScore: { fontSize: 22, fontWeight: "700" },
  healthLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  statList:   { flex: 1 },
  statRow:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statLabel:  { flex: 1, fontSize: 13, color: COLORS.gray },
  statValue:  { fontSize: 16, fontWeight: "700" },

  alertBanner: {
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  alertText: { fontSize: 13, fontWeight: "600" },

  tileRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tile: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12,
    padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 1,
  },
  tileValue: { fontSize: 24, fontWeight: "700", color: COLORS.skyDark },
  tileLabel: { fontSize: 11, color: COLORS.gray, textAlign: "center", marginTop: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: COLORS.skyDark, marginBottom: 10,
  },
  vesselCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  vesselCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  vesselName:  { fontSize: 16, fontWeight: "700", color: "#1f2937", flex: 1, marginRight: 8 },
  vesselMeta:  { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
  vesselBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
});
