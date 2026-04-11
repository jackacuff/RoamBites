import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTrucks, type TruckSummary } from "@workspace/api-client-react";
import {
  MapViewWrapper,
  animateMapToRegion,
  type Region,
} from "@/components/MapViewWrapper";
import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";

const OKC_REGION: Region = {
  latitude: 35.4676,
  longitude: -97.5164,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 67 : 49;

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [selectedTruck, setSelectedTruck] = useState<TruckSummary | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const isWeb = Platform.OS === "web";

  const { data: trucks, isLoading } = useListTrucks({ openNow: true });

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    if (Platform.OS !== "web") {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setLocationGranted(true);
          const loc = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
          // Auto-orient: fly to user location on first load
          animateMapToRegion(
            mapRef,
            { ...coords, latitudeDelta: 0.08, longitudeDelta: 0.08 },
            800
          );
        }
      } catch {}
    } else {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setUserLocation(coords);
            setLocationGranted(true);
          },
          () => {},
          { timeout: 6000, maximumAge: 120000 }
        );
      }
    }
  };

  const trucksWithLocation =
    (trucks ?? []).filter(
      (t) =>
        (t.isLive && t.currentLatitude != null && t.currentLongitude != null) ||
        (t.activeSchedule?.latitude != null && t.activeSchedule?.longitude != null)
    );

  const markers = trucksWithLocation.map((t) => {
    const useLiveCoords =
      t.isLive && t.currentLatitude != null && t.currentLongitude != null;
    return {
      id: t.id,
      latitude: useLiveCoords ? t.currentLatitude! : t.activeSchedule!.latitude!,
      longitude: useLiveCoords
        ? t.currentLongitude!
        : t.activeSchedule!.longitude!,
      color: t.isLive ? colors.accent : colors.primary,
    };
  });

  const handleMarkerPress = (id: number) => {
    const truck = trucksWithLocation.find((t) => t.id === id);
    if (truck) setSelectedTruck(truck);
  };

  const centerOnUser = () => {
    if (userLocation) {
      animateMapToRegion(
        mapRef,
        { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        400
      );
    }
  };

  // Bottom inset for the map: prevents native MapView from extending under the tab bar,
  // which would cause the native touch handler to intercept tab bar taps.
  const mapBottomInset = isWeb ? 0 : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? 67 + 8 : insets.top + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Live Map
          </Text>
          {locationGranted && (
            <Text style={[styles.locationHint, { color: colors.mutedForeground }]}>
              Centered on your location
            </Text>
          )}
        </View>
        {!isWeb && (
          <Pressable
            onPress={centerOnUser}
            style={[
              styles.locationBtn,
              {
                backgroundColor: locationGranted ? colors.primary + "18" : colors.muted,
                borderWidth: locationGranted ? 1 : 0,
                borderColor: locationGranted ? colors.primary + "40" : "transparent",
              },
            ]}
          >
            <Feather
              name="navigation"
              size={18}
              color={locationGranted ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <View style={[styles.mapContainer, { marginBottom: mapBottomInset }]}>
          <MapViewWrapper
            initialRegion={OKC_REGION}
            showsUserLocation={locationGranted}
            markers={markers}
            onMarkerPress={handleMarkerPress}
            mapRef={mapRef}
            trucks={trucks}
          />
        </View>
      )}

      {/* No trucks message (native only) */}
      {!isLoading && !isWeb && trucksWithLocation.length === 0 && !selectedTruck && (
        <View
          style={[
            styles.noTrucksCard,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
              bottom: insets.bottom + TAB_BAR_HEIGHT + 12,
            },
          ]}
        >
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noTrucksText, { color: colors.mutedForeground }]}>
            No trucks sharing live location right now
          </Text>
        </View>
      )}

      {/* Selected Truck Card (native only) */}
      {!isWeb && selectedTruck && (
        <Pressable
          onPress={() => router.push(`/trucks/${selectedTruck.id}`)}
          style={[
            styles.truckCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              bottom: insets.bottom + TAB_BAR_HEIGHT + 12,
            },
          ]}
        >
          <Pressable
            onPress={() => setSelectedTruck(null)}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.truckCardContent}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.truckName, { color: colors.foreground }]}>
                {selectedTruck.name}
              </Text>
              <Text
                style={[styles.truckCuisine, { color: colors.mutedForeground }]}
              >
                {selectedTruck.cuisine}
              </Text>
              {selectedTruck.currentLocation && (
                <Text
                  style={[
                    styles.truckLocation,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {selectedTruck.currentLocation}
                </Text>
              )}
            </View>
            <View style={styles.truckCardRight}>
              <StatusBadge
                status={selectedTruck.status}
                isLive={selectedTruck.isLive}
              />
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  locationHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  locationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    flex: 1,
  },
  noTrucksCard: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  noTrucksText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  truckCard: {
    position: "absolute",
    left: 16,
    right: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  truckCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 24,
  },
  truckName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  truckCuisine: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  truckLocation: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  truckCardRight: { alignItems: "flex-end", gap: 8 },
});
