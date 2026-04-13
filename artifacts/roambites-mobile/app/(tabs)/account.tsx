import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListFavorites } from "@workspace/api-client-react";
import { TruckCard } from "@/components/TruckCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, isLoading } = useAuth();
  const { data: favorites } = useListFavorites();
  const isWeb = Platform.OS === "web";

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.guestContainer,
          { paddingTop: isWeb ? 67 + 40 : insets.top + 60 },
        ]}
      >
        <View
          style={[
            styles.guestIcon,
            { backgroundColor: colors.muted, borderRadius: 50 },
          ]}
        >
          <Feather name="user" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.foreground }]}>
          Sign in to RoamBites
        </Text>
        <Text style={[styles.guestSub, { color: colors.mutedForeground }]}>
          Save your favorite trucks, write reviews, and access your full account
        </Text>
        <Pressable
          onPress={() => router.push("/auth/login")}
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/auth/signup")}
          style={[
            styles.secondaryBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
            Create Account
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  const roleMenuItems: {
    icon: string;
    label: string;
    route: string;
    color?: string;
  }[] = [];

  if (user.role === "vendor") {
    roleMenuItems.push({
      icon: "grid",
      label: "Vendor Dashboard",
      route: "/vendor",
    });
  }
  if (user.role === "organizer") {
    roleMenuItems.push({
      icon: "calendar",
      label: "Organizer Dashboard",
      route: "/organizer",
    });
  }
  if (user.role === "admin" || user.role === "superadmin") {
    roleMenuItems.push({
      icon: "shield",
      label: "Admin Dashboard",
      route: "/vendor",
    });
  }

  const favoriteTrucks = favorites
    ?.filter((f) => f.truck && f.truck.id)
    .map((f) => f.truck) ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 34 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View
        style={[
          styles.profileHeader,
          {
            paddingTop: isWeb ? 67 + 16 : insets.top + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
            {user.email}
          </Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <Text style={[styles.roleText, { color: colors.primary }]}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Role-specific section */}
      {roleMenuItems.length > 0 && (
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionLabel, { color: colors.mutedForeground }]}>
            Dashboard
          </Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {roleMenuItems.map((item, idx) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth:
                      idx < roleMenuItems.length - 1 ? 1 : 0,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.menuLabel, { color: colors.foreground }]}
                >
                  {item.label}
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Account section */}
      <View style={styles.menuSection}>
        <Text style={[styles.menuSectionLabel, { color: colors.mutedForeground }]}>
          Account
        </Text>
        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Pressable
            onPress={() => router.push("/auth/change-password")}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="lock" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Change Password</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.menuItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: colors.destructive + "18" },
              ]}
            >
              <Feather name="log-out" size={18} color={colors.destructive} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.destructive }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Favorites */}
      {favoriteTrucks.length > 0 && (
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionLabel, { color: colors.mutedForeground }]}>
            Saved Trucks ({favoriteTrucks.length})
          </Text>
          {favoriteTrucks.map((truck) =>
            truck?.id ? (
              <TruckCard
                key={truck.id}
                truck={{
                  id: truck.id!,
                  name: truck.name ?? "",
                  slug: truck.slug ?? "",
                  cuisine: truck.cuisine ?? "",
                  description: truck.description ?? null,
                  imageUrl: truck.imageUrl ?? null,
                  isApproved: truck.isApproved ?? false,
                  isLive: truck.isLive ?? false,
                  status: (truck.status as any) ?? "closed",
                  currentLocation: null,
                  currentCity: null,
                  activeSchedule: undefined as any,
                  vendorUserId: 0,
                }}
              />
            ) : null
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, gap: 0 },
  guestContainer: {
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  guestIcon: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  guestSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  userName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  userEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  menuSection: { marginTop: 20, gap: 6 },
  menuSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  menuCard: { borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
