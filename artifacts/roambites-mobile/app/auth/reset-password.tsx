import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { useColors } from "@/hooks/useColors";

function apiUrl(path: string) {
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return `${base}${path}`;
}

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords do not match.");
      return;
    }
    if (!token) {
      Alert.alert("Invalid reset link. Please request a new one.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone(true);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Network error. Please try again.");
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
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>

        {done ? (
          <View style={styles.successBlock}>
            <View style={[styles.successIcon, { backgroundColor: colors.accent + "25" }]}>
              <Feather name="check-circle" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Password reset!</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <Pressable
              onPress={() => router.replace("/auth/login")}
              style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 8 }]}
            >
              <Text style={styles.submitBtnText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.logoBlock}>
              <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                <Feather name="shield" size={26} color="#FFF" />
              </View>
              <Text style={[styles.logoTitle, { color: colors.foreground }]}>New password</Text>
              <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
                Choose a strong password for your account.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderRadius: colors.radius, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderRadius: colors.radius, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Repeat your password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitBtn, { backgroundColor: loading ? colors.muted : colors.primary, borderRadius: colors.radius }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Set new password</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  closeBtn: { alignSelf: "flex-end", marginBottom: 32 },
  logoBlock: { alignItems: "center", marginBottom: 40, gap: 10 },
  logoIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  logoTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  logoSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  form: { gap: 18 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  submitBtn: { paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successBlock: { alignItems: "center", gap: 16, paddingTop: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
