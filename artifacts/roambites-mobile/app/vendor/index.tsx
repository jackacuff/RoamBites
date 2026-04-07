import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetMyTruck,
  useCheckInTruck,
  useCheckOutTruck,
  useGetMySubscription,
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function VendorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: truck, isLoading, refetch } = useGetMyTruck();
  const { data: subscription } = useGetMySubscription();
  const checkIn = useCheckInTruck();
  const checkOut = useCheckOutTruck();

  const [goingLive, setGoingLive] = useState(false);

  const handleGoLive = async () => {
    if (!truck) return;
    setGoingLive(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (Platform.OS !== "web") {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } else if (typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve()
          );
        });
      }

      await checkIn.mutateAsync({
        truckId: String(truck.id),
        data: {
          latitude,
          longitude,
          liveOutsideSchedule: true,
        },
      });
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not go live");
    } finally {
      setGoingLive(false);
    }
  };

  const handleGoOffline = async () => {
    if (!truck) return;
    try {
      await checkOut.mutateAsync({ truckId: String(truck.id) });
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not go offline");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const subStatusColor =
    subscription?.status === "active" || subscription?.status === "trialing"
      ? colors.accent
      : colors.destructive;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 40 : insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? 67 + 16 : insets.top + 16,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Vendor Dashboard
        </Text>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
          Welcome back,
        </Text>
        <Text style={[styles.greetingName, { color: colors.foreground }]}>
          {user?.name ?? "Vendor"}
        </Text>
      </View>

      {!truck ? (
        <View
          style={[
            styles.noTruckCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="truck" size={32} color={colors.mutedForeground} />
          <Text style={[styles.noTruckTitle, { color: colors.foreground }]}>
            No truck registered yet
          </Text>
          <Text style={[styles.noTruckSub, { color: colors.mutedForeground }]}>
            Contact support to set up your food truck profile.
          </Text>
        </View>
      ) : (
        <>
          {/* Truck Status Card */}
          <View
            style={[
              styles.truckCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.truckCardHeader}>
              <View>
                <Text
                  style={[styles.truckName, { color: colors.foreground }]}
                >
                  {truck.name}
                </Text>
                <Text
                  style={[styles.truckCuisine, { color: colors.mutedForeground }]}
                >
                  {truck.cuisine}
                </Text>
              </View>
              <StatusBadge status={truck.status} isLive={truck.isLive} />
            </View>

            {/* Go Live / Offline Button */}
            <Pressable
              onPress={truck.isLive ? handleGoOffline : handleGoLive}
              disabled={goingLive || checkOut.isPending}
              style={[
                styles.liveBtn,
                {
                  backgroundColor: truck.isLive
                    ? colors.destructive
                    : colors.accent,
                  borderRadius: colors.radius / 2,
                  opacity:
                    goingLive || checkOut.isPending ? 0.6 : 1,
                },
              ]}
            >
              {goingLive || checkOut.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Feather
                    name={truck.isLive ? "wifi-off" : "wifi"}
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.liveBtnText}>
                    {truck.isLive ? "Go Offline" : "Go Live Now"}
                  </Text>
                </>
              )}
            </Pressable>

            {truck.currentLocation && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text
                  style={[styles.locationText, { color: colors.mutedForeground }]}
                >
                  {truck.currentLocation}
                </Text>
              </View>
            )}
          </View>

          {/* Subscription */}
          {subscription && (
            <View
              style={[
                styles.subCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.subHeader}>
                <Text style={[styles.subTitle, { color: colors.foreground }]}>
                  Subscription
                </Text>
                <View
                  style={[
                    styles.subBadge,
                    { backgroundColor: subStatusColor + "22" },
                  ]}
                >
                  <Text style={[styles.subBadgeText, { color: subStatusColor }]}>
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subPlan, { color: colors.mutedForeground }]}>
                {subscription.planName} — $
                {(subscription.monthlyPrice / 100).toFixed(0)}/mo
              </Text>
              {subscription.trialDaysLeft != null &&
                subscription.trialDaysLeft > 0 && (
                  <Text
                    style={[styles.subTrial, { color: colors.secondary }]}
                  >
                    {subscription.trialDaysLeft} trial days remaining
                  </Text>
                )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text
              style={[styles.actionsTitle, { color: colors.mutedForeground }]}
            >
              Quick Actions
            </Text>
            <View style={styles.actionsGrid}>
              {[
                {
                  icon: "list" as const,
                  label: "View Truck",
                  onPress: () => router.push(`/trucks/${truck.id}`),
                },
                {
                  icon: "calendar" as const,
                  label: "Schedule",
                  onPress: () => router.push(`/trucks/${truck.id}`),
                },
                {
                  icon: "star" as const,
                  label: "Reviews",
                  onPress: () => router.push(`/trucks/${truck.id}`),
                },
                {
                  icon: "bar-chart-2" as const,
                  label: "Browse",
                  onPress: () => router.push("/(tabs)/browse"),
                },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.actionCard,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name={action.icon} size={22} color={colors.primary} />
                  <Text
                    style={[styles.actionLabel, { color: colors.foreground }]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  greetingSection: { marginBottom: 4 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  greetingName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  noTruckCard: {
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  noTruckTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  noTruckSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  truckCard: { padding: 16, borderWidth: 1, gap: 14 },
  truckCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  truckName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  truckCuisine: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  liveBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  subCard: { padding: 16, borderWidth: 1, gap: 6 },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  subBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subPlan: { fontSize: 13, fontFamily: "Inter_400Regular" },
  subTrial: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionsSection: { gap: 10 },
  actionsTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "47%",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
