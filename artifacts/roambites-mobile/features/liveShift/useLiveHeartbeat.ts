import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { postHeartbeat } from "./liveShiftApi";

interface Params {
  truckId: number | null;
  isLive: boolean;
  onNotLive?: () => void;
}

// Minimum spacing between heartbeats regardless of movement signal
const MIN_INTERVAL_MS = 20_000;
// Distance threshold (meters) that also triggers a heartbeat between intervals
const MIN_DISTANCE_M = 25;

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function useLiveHeartbeat({ truckId, isLive, onNotLive }: Params): void {
  const { token } = useAuth();
  const subRef = useRef<{ remove: () => void } | null>(null);
  const lastSentRef = useRef<{ at: number; coords: { latitude: number; longitude: number } } | null>(
    null,
  );
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!isLive || !truckId || !token) return;
      if (Platform.OS === "web") return; // web tracker not a streaming client for MVP

      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: MIN_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_M,
        },
        async (loc) => {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const now = Date.now();
          const last = lastSentRef.current;
          const movedEnough = !last || haversineMeters(last.coords, coords) >= MIN_DISTANCE_M;
          const waitedEnough = !last || now - last.at >= MIN_INTERVAL_MS;
          if (!waitedEnough && !movedEnough) return;
          if (inFlightRef.current) return;

          inFlightRef.current = true;
          try {
            await postHeartbeat(truckId, token, {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracyMeters: loc.coords.accuracy ?? null,
              headingDegrees: loc.coords.heading ?? null,
              speedMps: loc.coords.speed ?? null,
              recordedAt: new Date(loc.timestamp).toISOString(),
            });
            lastSentRef.current = { at: now, coords };
          } catch (err: any) {
            if (err?.code === "NOT_LIVE") {
              onNotLive?.();
              subRef.current?.remove();
              subRef.current = null;
            }
            // Silent retry on transient errors; next callback will try again.
          } finally {
            inFlightRef.current = false;
          }
        },
      );
    }

    start();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && subRef.current) {
        // For MVP we stop streaming when app is backgrounded.
        // Background streaming requires background-location entitlement + TaskManager.
        subRef.current.remove();
        subRef.current = null;
      } else if (state === "active" && isLive) {
        start();
      }
    });

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      appStateSub.remove();
    };
  }, [truckId, isLive, token, onNotLive]);
}
