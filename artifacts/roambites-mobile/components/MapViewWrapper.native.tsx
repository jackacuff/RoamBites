import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

export type { Region };

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
  mapRef?: React.RefObject<MapView | null>;
}

export function MapViewWrapper({
  initialRegion,
  showsUserLocation,
  markers,
  onMarkerPress,
  mapRef,
}: MapViewWrapperProps) {
  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={!!showsUserLocation}
      showsMyLocationButton={false}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          onPress={() => onMarkerPress(m.id)}
          pinColor={m.color}
        />
      ))}
    </MapView>
  );
}

export function animateMapToRegion(
  mapRef: React.RefObject<MapView | null>,
  region: Region,
  duration = 400
) {
  mapRef.current?.animateToRegion(region, duration);
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
