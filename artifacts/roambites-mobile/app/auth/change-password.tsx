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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

function apiUrl(path: string) {
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return `${base}${path}`;
}

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!current) { Alert.alert("Current password is required."); return; }
    if (next.length < 6) { Alert.alert("New password must be at least 6 characters."); return; }
    if (next !== confirm) { Alert.alert("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password.");
      Alert.alert("Password changed!", "Your password has been updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong. Please try again.");
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
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoBlock}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Feather name="lock" size={26} color="#FFF" />
          </View>
          <Text style={[styles.logoTitle, { color: colors.foreground }]}>Change password</Text>
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Enter your current password, then choose a new one.
          </Text>
        </View>

        <View style={styles.form}>
          {[
            { label: "Current password", value: current, onChange: setCurrent, placeholder: "Your current password" },
            { label: "New password", value: next, onChange: setNext, placeholder: "At least 6 characters" },
            { label: "Confirm new password", value: confirm, onChange: setConfirm, placeholder: "Repeat your new password" },
          ].map((f) => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderRadius: colors.radius, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                />
                {f.label === "Current password" && (
                  <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8}>
                    <Feather name={showPw ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.muted : colors.primary, borderRadius: colors.radius }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Change password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  closeBtn: { alignSelf: "flex-start", marginBottom: 32 },
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
});
