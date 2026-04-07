import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import type { TruckSummary } from "@workspace/api-client-react";

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  color: string;
}

interface MapViewWrapperProps {
  initialRegion: Region;
  showsUserLocation?: boolean;
  markers: MapMarker[];
  onMarkerPress: (id: number) => void;
  mapRef?: any;
  trucks?: TruckSummary[];
}

export function MapViewWrapper({ trucks }: MapViewWrapperProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.notice,
          {
            backgroundColor: colors.secondary + "22",
            borderRadius: 8,
          },
        ]}
      >
        <Feather name="monitor" size={14} color={colors.secondary} />
        <Text style={[styles.noticeText, { color: colors.secondary }]}>
          Live map is available in the Expo Go mobile app
        </Text>
      </View>
      {trucks && trucks.length > 0 && (
        <FlatList
          data={trucks}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/trucks/${item.id}`)}
              style={({ pressed }) => [
                styles.truckRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.truckName, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.truckCuisine, { color: colors.mutedForeground }]}
                >
                  {item.cuisine}
                </Text>
                {item.currentLocation && (
                  <View style={styles.locationRow}>
                    <Feather
                      name="map-pin"
                      size={12}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {item.currentLocation}
                    </Text>
                  </View>
                )}
              </View>
              <StatusBadge status={item.status} isLive={item.isLive} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export function animateMapToRegion(_mapRef: any, _region: Region, _duration?: number) {
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
  },
  noticeText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  list: { paddingHorizontal: 16, gap: 10 },
  truckRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  truckName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  truckCuisine: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
