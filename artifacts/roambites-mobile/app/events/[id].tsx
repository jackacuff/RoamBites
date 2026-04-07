import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetEvent } from "@workspace/api-client-react";
import { TruckCard } from "@/components/TruckCard";
import { useColors } from "@/hooks/useColors";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading } = useGetEvent(id);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Event not found
        </Text>
      </View>
    );
  }

  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  const dateStr = startDate.toLocaleDateString("default", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = `${startDate.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })}`;

  const confirmedTrucks = event.trucks
    ?.filter((t) => t.status === "confirmed")
    .map((t) => t.truck)
    .filter(Boolean) ?? [];

  const openMaps = () => {
    if (event.address) {
      const query = encodeURIComponent(
        `${event.venueName} ${event.address} ${event.city}`
      );
      const url = Platform.OS === "ios"
        ? `maps:?q=${query}`
        : `geo:0,0?q=${query}`;
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "ios" ? insets.top + 8 : 16,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.muted, borderRadius: 20 },
          ]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Date block */}
      <View
        style={[
          styles.dateHero,
          { backgroundColor: colors.primary },
        ]}
      >
        <Text style={styles.dateHeroText}>
          {startDate.toLocaleDateString("default", {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={[styles.eventName, { color: colors.foreground }]}>
          {event.name}
        </Text>

        <View style={styles.metaRow}>
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {dateStr}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="clock" size={15} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {timeStr}
          </Text>
        </View>
        <Pressable style={styles.metaRow} onPress={openMaps}>
          <Feather name="map-pin" size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.metaText, { color: colors.primary }]}>
              {event.venueName}
            </Text>
            {event.address && (
              <Text style={[styles.metaSubText, { color: colors.mutedForeground }]}>
                {event.address}, {event.city}
              </Text>
            )}
          </View>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        </Pressable>

        {event.description && (
          <Text style={[styles.description, { color: colors.foreground }]}>
            {event.description}
          </Text>
        )}

        {event.publicNotes && (
          <View
            style={[
              styles.notesCard,
              {
                backgroundColor: colors.secondary + "18",
                borderRadius: colors.radius / 2,
              },
            ]}
          >
            <Feather name="info" size={14} color={colors.secondary} />
            <Text style={[styles.notesText, { color: colors.foreground }]}>
              {event.publicNotes}
            </Text>
          </View>
        )}
      </View>

      {/* Confirmed Trucks */}
      {confirmedTrucks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Attending Trucks ({confirmedTrucks.length})
          </Text>
          {confirmedTrucks.map((truck) =>
            truck ? (
              <TruckCard key={truck.id} truck={truck} />
            ) : null
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  content: {},
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dateHero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  dateHeroText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  eventName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  metaText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  metaSubText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: 12,
  },
  notesCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    marginTop: 12,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
});
