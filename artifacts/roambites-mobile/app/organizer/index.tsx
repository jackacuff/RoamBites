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
import { useListEvents, useCreateEvent } from "@workspace/api-client-react";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function OrganizerDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: events, isLoading, refetch } = useListEvents({ upcoming: true });
  const createEvent = useCreateEvent();

  const myEvents = events?.filter((e) => e.organizerUserId === user?.id) ?? [];

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
          Organizer Dashboard
        </Text>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
          Welcome back,
        </Text>
        <Text style={[styles.greetingName, { color: colors.foreground }]}>
          {user?.name ?? "Organizer"}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.primary + "18",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {myEvents.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            My Events
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.accent + "18",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {myEvents.reduce((sum, e) => sum + e.confirmedTruckCount, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Confirmed Trucks
          </Text>
        </View>
      </View>

      {/* My Events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            My Events
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : myEvents.length > 0 ? (
          myEvents.map((event) => <EventCard key={event.id} event={event} />)
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
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No events yet
            </Text>
            <Text
              style={[styles.emptySub, { color: colors.mutedForeground }]}
            >
              Use the web dashboard to create and manage your events
            </Text>
          </View>
        )}
      </View>

      {/* All Upcoming Events */}
      {events && events.length > myEvents.length && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            All Upcoming Events
          </Text>
          {events
            .filter((e) => e.organizerUserId !== user?.id)
            .slice(0, 5)
            .map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text
          style={[styles.actionsLabel, { color: colors.mutedForeground }]}
        >
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          {[
            {
              icon: "list" as const,
              label: "Browse Events",
              onPress: () => router.push("/(tabs)/events"),
            },
            {
              icon: "truck" as const,
              label: "Browse Trucks",
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 16, alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  section: { gap: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyCard: {
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  actionsLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  actionsGrid: { flexDirection: "row", gap: 10 },
  actionCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
