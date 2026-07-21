import { Tabs } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";

// Expo Router requires ALL tab screens to be declared in the layout.
// We use tabBarButton to hide role-specific tabs without removing them.
const hidden = () => null;

export default function TabLayout() {
  const user = useQuery(api.users.currentUser);
  const isOwner = user?.role === "owner";
  const isMechanic = user?.role === "mechanic";
  const isFleetManager = user?.role === "fleet_manager";
  const isCaptain = user?.role === "captain";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: "#6b7280",
        headerStyle: {
          backgroundColor: "#0284c7",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vessels"
        options={{
          title: "My Vessels",
          tabBarButton: isOwner ? undefined : hidden,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="boat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: "Fleet",
          tabBarButton: isFleetManager ? undefined : hidden,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="captain"
        options={{
          title: "Captain",
          tabBarButton: isCaptain ? undefined : hidden,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan QR",
          tabBarButton: isMechanic ? undefined : hidden,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: "Work Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
