import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTrucks, useListEvents } from "@workspace/api-client-react";
import { EventCard } from "@/components/EventCard";
import { TruckCard } from "@/components/TruckCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const {
    data: liveTrucks,
    isLoading: trucksLoading,
    refetch: refetchTrucks,
  } = useListTrucks({ openNow: true });
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useListEvents({ upcoming: true });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrucks(), refetchEvents()]);
    setRefreshing(false);
  };

  const quickActions = [
    { icon: "map-pin" as const, label: "Find Near Me", route: "/(tabs)/map" as any },
    { icon: "truck" as const, label: "Browse All", route: "/(tabs)/browse" as any },
    { icon: "calendar" as const, label: "Explore Events", route: "/(tabs)/events" as any },
  ];

  const featuredEvents = events?.filter((e) => e.isFeatured) ?? [];
  const regularEvents = events?.filter((e) => !e.isFeatured) ?? [];
  const sortedEvents = [...featuredEvents, ...regularEvents];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 34 : insets.bottom + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View
        style={[
          styles.hero,
          { paddingTop: isWeb ? 67 + 16 : insets.top + 16 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {user ? `${getTimeGreeting()}, ${user.name.split(" ")[0]}` : getTimeGreeting()}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {user ? "Find trucks near you" : "Find food trucks"}
          </Text>
          {!user && (
            <Text style={[styles.heroAccent, { color: colors.primary }]}>
              near you
            </Text>
          )}
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
              Central Oklahoma
            </Text>
          </View>
        </View>
        {user && (
          <Pressable
            onPress={() => router.push("/(tabs)/account")}
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route)}
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Feather name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text
              style={[styles.quickActionLabel, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Live Trucks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.liveIndicator, { backgroundColor: colors.accent }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Open Now
            </Text>
            {liveTrucks && liveTrucks.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.countBadgeText, { color: colors.accent }]}>
                  {liveTrucks.length}
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => router.push("/(tabs)/browse")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              See all
            </Text>
          </Pressable>
        </View>
        {trucksLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : liveTrucks && liveTrucks.length > 0 ? (
          <FlatList
            data={liveTrucks.slice(0, 10)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <TruckCard truck={item} compact />}
            contentContainerStyle={{ paddingRight: 16 }}
            scrollEnabled={liveTrucks.length > 1}
          />
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.muted,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="truck" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No trucks open right now
            </Text>
          </View>
        )}
      </View>

      {/* Upcoming Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Upcoming Events
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/events")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              See all
            </Text>
          </Pressable>
        </View>
        {eventsLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : sortedEvents && sortedEvents.length > 0 ? (
          sortedEvents.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.muted,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="calendar" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No upcoming events
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 33,
  },
  heroAccent: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 33,
    marginTop: -2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  loader: { marginVertical: 20 },
  emptyCard: {
    padding: 20,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
