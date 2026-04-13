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

function apiUrl(path: string) {
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return `${base}${path}`;
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong.");
      }
      setSent(true);
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
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        {sent ? (
          <View style={styles.successBlock}>
            <View style={[styles.successIcon, { backgroundColor: colors.accent + "25" }]}>
              <Feather name="check-circle" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Check your inbox</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              If an account exists for {email}, we've sent a reset link. Check your spam folder if you don't see it.
            </Text>
            <Pressable
              onPress={() => router.replace("/auth/login")}
              style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 8 }]}
            >
              <Text style={styles.submitBtnText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.logoBlock}>
              <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                <Feather name="lock" size={26} color="#FFF" />
              </View>
              <Text style={[styles.logoTitle, { color: colors.foreground }]}>Forgot password?</Text>
              <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
                Enter your email and we'll send you a reset link.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email address</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderRadius: colors.radius, borderColor: colors.border }]}>
                  <Feather name="mail" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
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
                  <Text style={styles.submitBtnText}>Send reset link</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Remember your password? </Text>
              <Pressable onPress={() => router.replace("/auth/login")}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  successBlock: { alignItems: "center", gap: 16, paddingTop: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
