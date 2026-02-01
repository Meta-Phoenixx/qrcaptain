import { Authenticated, Unauthenticated } from "convex/react";
import { Redirect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Unauthenticated>
        <View style={styles.content}>
          <Text style={styles.emoji}>⚓</Text>
          <Text style={styles.title}>QR Captain</Text>
          <Text style={styles.subtitle}>
            Complete vessel maintenance tracking
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </Unauthenticated>

      <Authenticated>
        <Redirect href="/(tabs)" />
      </Authenticated>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#0c4a6e",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#0369a1",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    maxWidth: 300,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#0284c7",
  },
  secondaryButtonText: {
    color: "#0284c7",
  },
});
