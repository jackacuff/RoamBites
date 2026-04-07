import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TruckSummary } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

interface TruckCardProps {
  truck: TruckSummary;
  compact?: boolean;
}

export function TruckCard({ truck, compact = false }: TruckCardProps) {
  const colors = useColors();

  return (
    <Pressable
      testID={`truck-card-${truck.id}`}
      onPress={() => router.push(`/trucks/${truck.id}`)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
        compact && styles.compact,
      ]}
    >
      {truck.imageUrl ? (
        <Image
          source={{ uri: truck.imageUrl }}
          style={compact ? styles.compactImage : styles.image}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            compact ? styles.compactImage : styles.image,
            styles.imagePlaceholder,
            { backgroundColor: colors.muted },
          ]}
        >
          <Feather name="truck" size={compact ? 20 : 28} color={colors.mutedForeground} />
        </View>
      )}
      <View style={[styles.content, compact && styles.compactContent]}>
        <View style={styles.header}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {truck.name}
          </Text>
          <StatusBadge status={truck.status} isLive={truck.isLive} compact />
        </View>
        <Text style={[styles.cuisine, { color: colors.mutedForeground }]}>
          {truck.cuisine}
        </Text>
        {!compact && truck.currentLocation && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text
              style={[styles.locationText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {truck.currentLocation}
            </Text>
          </View>
        )}
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
  compact: {
    width: 190,
    flexDirection: "column",
    marginRight: 12,
    marginBottom: 0,
  },
  image: {
    width: 90,
    height: 90,
  },
  compactImage: {
    width: "100%" as any,
    height: 110,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
    gap: 4,
  },
  compactContent: {
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cuisine: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
