import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

export default function SignUp() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "mechanic">("owner");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      formData.append("flow", "signUp");

      await signIn("password", formData);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Sign Up Failed",
        error instanceof Error ? error.message : "Please try again"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Smith"
            placeholderTextColor="#6b7280"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            secureTextEntry
          />

          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "owner" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("owner")}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === "owner" && styles.roleButtonTextActive,
                ]}
              >
                🚤 Boat Owner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "mechanic" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("mechanic")}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === "mechanic" && styles.roleButtonTextActive,
                ]}
              >
                🔧 Mechanic
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.linkText}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000",
    marginBottom: 16,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  roleButtonActive: {
    borderColor: "#0284c7",
    backgroundColor: "#e0f2fe",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  roleButtonTextActive: {
    color: "#0284c7",
  },
  button: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: "#0284c7",
    fontSize: 16,
  },
});
