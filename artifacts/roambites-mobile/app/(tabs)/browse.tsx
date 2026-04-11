import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTrucks } from "@workspace/api-client-react";
import { SearchBar } from "@/components/SearchBar";
import { TruckCard } from "@/components/TruckCard";
import { useColors } from "@/hooks/useColors";

type SortMode = "default" | "topRated";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [search, setSearch] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [sortMode] = useState<SortMode>("default");
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: trucks, isLoading, refetch } = useListTrucks({
    search: search || undefined,
    openNow: openNow || undefined,
  });

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    if (Platform.OS !== "web") {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {}
    } else {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {},
          { timeout: 6000, maximumAge: 120000 }
        );
      }
    }
  };

  const sortedTrucks = useMemo(() => {
    if (!trucks) return [];
    const withDist = trucks.map((t) => {
      let distanceKm: number | undefined;
      if (userLocation) {
        const lat = t.isLive && t.currentLatitude != null ? t.currentLatitude : t.activeSchedule?.latitude;
        const lng = t.isLive && t.currentLongitude != null ? t.currentLongitude : t.activeSchedule?.longitude;
        if (lat != null && lng != null) {
          distanceKm = haversineKm(userLocation.lat, userLocation.lng, lat, lng);
        }
      }
      return { ...t, distanceKm };
    });

    if (sortMode === "default") {
      return [...withDist].sort((a, b) => {
        const aOpen = a.status === "open" ? 1 : 0;
        const bOpen = b.status === "open" ? 1 : 0;
        return bOpen - aOpen;
      });
    }
    return withDist;
  }, [trucks, sortMode, userLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const chips: { label: string; active: boolean; onPress: () => void }[] = [
    {
      label: "Open Now",
      active: openNow,
      onPress: () => setOpenNow(!openNow),
    },
    {
      label: "All Trucks",
      active: !openNow && sortMode === "default",
      onPress: () => setOpenNow(false),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? 67 + 8 : insets.top + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Browse Trucks
          </Text>
          {userLocation && (
            <View style={[styles.locationBadge, { backgroundColor: "#dcfce7" }]}>
              <Text style={styles.locationBadgeText}>📍 Distances on</Text>
            </View>
          )}
        </View>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search trucks, cuisines..."
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.label}
              onPress={chip.onPress}
              style={[
                styles.chip,
                {
                  backgroundColor: chip.active ? colors.primary : colors.muted,
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: chip.active ? "#FFF" : colors.mutedForeground },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={sortedTrucks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TruckCard truck={item} distanceKm={item.distanceKm} />
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: isWeb ? 34 : insets.bottom + 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sortedTrucks.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            sortedTrucks.length > 0
              ? () => (
                  <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                    {sortedTrucks.length} truck{sortedTrucks.length !== 1 ? "s" : ""}
                    {openNow ? " open now" : " in Central Oklahoma"}
                  </Text>
                )
              : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No trucks found
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  locationBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#15803d",
  },
  searchWrap: { marginBottom: 10 },
  filtersRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
