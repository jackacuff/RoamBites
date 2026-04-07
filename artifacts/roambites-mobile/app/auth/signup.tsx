import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signup as signupApi } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLES = [
  { value: "customer", label: "Food Lover", icon: "heart" as const, desc: "Discover & follow trucks" },
  { value: "vendor", label: "Food Truck Owner", icon: "truck" as const, desc: "Manage your truck" },
  { value: "organizer", label: "Event Organizer", icon: "calendar" as const, desc: "Host food truck events" },
];

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor" | "organizer">(
    "customer"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await signupApi({
        data: { name: name.trim(), email: email.trim(), password, role },
      });
      await login(res.token, res.user);
      router.dismissAll();
    } catch (err: any) {
      Alert.alert("Signup Failed", err?.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={8}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoBlock}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Feather name="truck" size={28} color="#FFF" />
          </View>
          <Text style={[styles.logoTitle, { color: colors.foreground }]}>
            Join RoamBites
          </Text>
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Create your free account
          </Text>
        </View>

        {/* Role selector */}
        <View style={styles.roleSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            I am a...
          </Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value as any)}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor:
                      role === r.value ? colors.primary + "18" : colors.muted,
                    borderColor:
                      role === r.value ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name={r.icon}
                  size={22}
                  color={role === r.value ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.roleLabel,
                    {
                      color:
                        role === r.value ? colors.primary : colors.foreground,
                    },
                  ]}
                >
                  {r.label}
                </Text>
                <Text
                  style={[styles.roleDesc, { color: colors.mutedForeground }]}
                >
                  {r.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {[
            {
              label: "Full Name",
              value: name,
              onChange: setName,
              icon: "user" as const,
              placeholder: "Your name",
              keyboardType: "default" as const,
              autoCapitalize: "words" as const,
              secureTextEntry: false,
            },
            {
              label: "Email",
              value: email,
              onChange: setEmail,
              icon: "mail" as const,
              placeholder: "your@email.com",
              keyboardType: "email-address" as const,
              autoCapitalize: "none" as const,
              secureTextEntry: false,
            },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {field.label}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.muted,
                    borderRadius: colors.radius,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name={field.icon}
                  size={16}
                  color={colors.mutedForeground}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.foreground, fontFamily: "Inter_400Regular" },
                  ]}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.muted,
                  borderRadius: colors.radius,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={[
              styles.submitBtn,
              {
                backgroundColor: loading ? colors.muted : colors.primary,
                borderRadius: colors.radius,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  closeBtn: { alignSelf: "flex-end", marginBottom: 24 },
  logoBlock: { alignItems: "center", marginBottom: 28, gap: 8 },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  logoSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  roleSection: { marginBottom: 20, gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleGrid: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  roleLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  roleDesc: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  submitBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
