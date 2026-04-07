import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { EventSummary } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

interface EventCardProps {
  event: EventSummary;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const colors = useColors();

  const startDate = new Date(event.startDateTime);
  const month = startDate
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  const day = startDate.getDate();
  const time = startDate.toLocaleTimeString("default", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Pressable
      testID={`event-card-${event.id}`}
      onPress={() => router.push(`/events/${event.id}`)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
        compact && { width: 220, marginRight: 12, marginBottom: 0 },
      ]}
    >
      <View style={[styles.dateBlock, { backgroundColor: colors.primary }]}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.day}>{day}</Text>
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {event.name}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text
            style={[styles.metaText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {event.venueName}, {event.city}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {time}
          </Text>
          {event.confirmedTruckCount > 0 && (
            <>
              <Text style={{ color: colors.border }}> · </Text>
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {event.confirmedTruckCount} trucks
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  dateBlock: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  month: {
    fontSize: 10,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  day: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: "center",
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
