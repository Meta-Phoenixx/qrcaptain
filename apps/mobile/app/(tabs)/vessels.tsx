import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
export default function Vessels() {
  const vessels = useQuery(api.vessels.listMyVessels);

  if (vessels === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vessels}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚤</Text>
            <Text style={styles.emptyTitle}>No Vessels Yet</Text>
            <Text style={styles.emptyText}>
              Add your first vessel to start tracking maintenance
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardBadge}>{item.vesselType}</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {item.year} {item.make} {item.model}
            </Text>
            {item.registrationNumber && (
              <Text style={styles.cardMeta}>
                Reg: {item.registrationNumber}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+ Add Vessel</Text>
      </TouchableOpacity>
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
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center",
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  cardBadge: {
    backgroundColor: "#e0f2fe",
    color: "#0284c7",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  cardMeta: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    left: 24,
    backgroundColor: "#0284c7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
