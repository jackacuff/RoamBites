import { useEffect, useState } from "react";

export interface LiveTruck {
  id: number;
  slug: string;
  name: string;
  cuisine: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  headingDegrees: number | null;
  speedMps: number | null;
  locationUpdatedAt: string | null;
  liveStartedAt: string | null;
  liveUntil: string | null;
}

const POLL_MS = 30_000;

function baseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

export function useLiveTrucks(): { data: LiveTruck[]; isLoading: boolean } {
  const [data, setData] = useState<LiveTruck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await fetch(`${baseUrl()}/api/trucks/live`);
        if (!res.ok) return;
        const json = (await res.json()) as LiveTruck[];
        if (!cancelled) setData(json);
      } catch {
        // Silent — polling will retry
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchOnce();
    const timer = setInterval(fetchOnce, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { data, isLoading };
}
