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
    { icon: "map-pin" as const, label: "Live Map", route: "/(tabs)/map" as any },
    { icon: "truck" as const, label: "Browse", route: "/(tabs)/browse" as any },
    { icon: "calendar" as const, label: "Events", route: "/(tabs)/events" as any },
  ];

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
            {user ? `Hey, ${user.name.split(" ")[0]}` : "Welcome to"}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            RoamBites
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Central Oklahoma Food Trucks
          </Text>
        </View>
        {user ? (
          <Pressable
            onPress={() => router.push("/(tabs)/account")}
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={[
              styles.signInBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={styles.signInText}>Sign In</Text>
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
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Live Trucks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Open Now
          </Text>
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
        ) : events && events.length > 0 ? (
          events.slice(0, 3).map((event) => (
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
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
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
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
  sectionTitle: {
    fontSize: 18,
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
