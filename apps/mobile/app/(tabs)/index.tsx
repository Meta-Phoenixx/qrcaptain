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

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  in_service:     { label: "In Service",     bg: "#f0fdf4", color: "#10b981" },
  in_maintenance: { label: "In Maintenance", bg: "#fffbeb", color: "#f59e0b" },
  out_of_service: { label: "Out of Service", bg: "#fef2f2", color: "#ef4444" },
  storage:        { label: "Storage",        bg: "#f3f4f6", color: "#6b7280" },
};

function VesselStatusBadge({ status }: { status?: string }) {
  const entry = STATUS_MAP[status ?? ""] ?? { label: "Active", bg: "#f0fdf4", color: "#10b981" };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: entry.bg }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: entry.color }}>{entry.label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const user = useQuery(api.users.currentUser);

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  const roleLabel =
    user.role === "owner" ? "🚤 Boat Owner"
    : user.role === "mechanic" ? "🔧 Mechanic"
    : user.role === "fleet_manager" ? "⚓ Fleet Manager"
    : user.role === "captain" ? "🧭 Captain"
    : user.role === "admin" ? "🛡 Admin"
    : user.role;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || "User"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {user.role === "owner" && <OwnerDashboard />}
      {user.role === "mechanic" && <MechanicDashboard />}
      {user.role === "fleet_manager" && <FleetManagerQuickStats />}
      {user.role === "captain" && <CaptainQuickView />}
    </ScrollView>
  );
}

function OwnerDashboard() {
  const vessels = useQuery(api.vessels.listMyVessels);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Vessels</Text>
      {vessels?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No vessels yet. Add your first vessel to get started!
          </Text>
        </View>
      ) : (
        vessels?.map((vessel) => (
          <View key={vessel._id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={styles.cardTitle}>{vessel.name}</Text>
              <VesselStatusBadge status={(vessel as any).status} />
            </View>
            <Text style={styles.cardSubtitle}>
              {vessel.year} {vessel.make} {vessel.model}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function MechanicDashboard() {
  const workOrders = useQuery(api.workOrders.getMyWorkOrders, {
    status: "in_progress",
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Active Work Orders</Text>
      {workOrders?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No active work orders. Scan a vessel QR code to start!
          </Text>
        </View>
      ) : (
        workOrders?.map((wo) => (
          <View key={wo._id} style={styles.card}>
            <Text style={styles.cardTitle}>{wo.vesselName}</Text>
            <Text style={styles.cardSubtitle}>{wo.description}</Text>
            <Text style={styles.cardMeta}>
              Started: {new Date(wo.startedAt).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function FleetManagerQuickStats() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = api as any;
  const fleetList = useQuery(a.fleetDashboard.listAllFleetsDashboard);
  const dashboard = useQuery(
    a.fleetDashboard.getFleetDashboard,
    fleetList?.[0] ? { fleetId: fleetList[0]._id } : "skip"
  );

  if (!fleetList || !dashboard) return (
    <View style={styles.section}>
      <ActivityIndicator color="#0284c7" />
    </View>
  );

  if (fleetList.length === 0) return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Fleet</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No fleets yet. Set one up on the web app.</Text>
      </View>
    </View>
  );

  const healthColor = dashboard.healthScore >= 80 ? "#10b981" : dashboard.healthScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{fleetList[0].name}</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={[styles.card, { flex: 1, alignItems: "center", paddingVertical: 16 }]}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: healthColor }}>{dashboard.healthScore}%</Text>
          <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Fleet Health</Text>
        </View>
        <View style={[styles.card, { flex: 1, alignItems: "center", paddingVertical: 16 }]}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#0c4a6e" }}>{dashboard.totalVessels}</Text>
          <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Total Vessels</Text>
        </View>
      </View>

      {dashboard.overdueCount > 0 && (
        <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 13 }}>
            ⚠ {dashboard.overdueCount} vessel{dashboard.overdueCount > 1 ? "s" : ""} overdue for service
          </Text>
        </View>
      )}
      {dashboard.insuranceMissing > 0 && (
        <View style={{ backgroundColor: "#fffbeb", borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 13 }}>
            ⚠ {dashboard.insuranceMissing} vessel{dashboard.insuranceMissing > 1 ? "s" : ""} missing insurance
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Quick Stats</Text>
        <Text style={{ fontSize: 13, color: "#1f2937" }}>✅ {dashboard.inServiceCount} in service</Text>
        <Text style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>🔧 {dashboard.inMaintenanceCount} in maintenance</Text>
        <Text style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>📋 {dashboard.totalOpenWorkOrders} open work orders</Text>
      </View>
    </View>
  );
}

function CaptainQuickView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = api as any;
  const assignments = useQuery(a.captains.listMyAssignments);

  if (!assignments) return (
    <View style={styles.section}>
      <ActivityIndicator color="#0284c7" />
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>My Vessels</Text>
      {assignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No vessels assigned yet. Your fleet manager will assign you to a vessel.</Text>
        </View>
      ) : (
        assignments.map((a: any) => (
          <View key={a.vesselId} style={styles.card}>
            <Text style={styles.cardTitle}>{a.vesselName}</Text>
            <Text style={styles.cardSubtitle}>Use the Captain tab to file reports or send a distress notice.</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
  },
  header: {
    backgroundColor: "#0284c7",
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: "#bae6fd",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  roleText: {
    color: "#fff",
    fontWeight: "600",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0c4a6e",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center",
  },
});
