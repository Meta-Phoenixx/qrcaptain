import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";

export default function Dashboard() {
  const user = useQuery(api.users.currentUser);

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || "User"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user.role === "owner" ? "🚤 Boat Owner" : "🔧 Mechanic"}
          </Text>
        </View>
      </View>

      {user.role === "owner" ? (
        <OwnerDashboard />
      ) : (
        <MechanicDashboard />
      )}
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
            <Text style={styles.cardTitle}>{vessel.name}</Text>
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
