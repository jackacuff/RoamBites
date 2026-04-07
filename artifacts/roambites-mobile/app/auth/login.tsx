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
import { login as loginApi } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi({
        data: { email: email.trim(), password },
      });
      await login(res.token, res.user);
      router.dismissAll();
    } catch (err: any) {
      Alert.alert(
        "Login Failed",
        err?.message ?? "Invalid email or password"
      );
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
        {/* Header */}
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
            RoamBites
          </Text>
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Sign in to your account
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Email
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
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

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
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
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
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
          </Text>
          <Pressable onPress={() => router.replace("/auth/signup")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Sign Up
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
  closeBtn: { alignSelf: "flex-end", marginBottom: 32 },
  logoBlock: { alignItems: "center", marginBottom: 40, gap: 10 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  logoSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  form: { gap: 18 },
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
    marginTop: 28,
  },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
