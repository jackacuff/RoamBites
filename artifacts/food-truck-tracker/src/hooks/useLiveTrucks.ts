import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

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

async function fetchLiveTrucks(): Promise<LiveTruck[]> {
  const res = await fetch(getApiUrl("/api/trucks/live"));
  if (!res.ok) throw new Error(`live trucks: ${res.status}`);
  return res.json();
}

export function useLiveTrucks() {
  return useQuery({
    queryKey: ["trucks", "live"],
    queryFn: fetchLiveTrucks,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
