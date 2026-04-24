export interface HeartbeatPayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  headingDegrees?: number | null;
  speedMps?: number | null;
  recordedAt?: string;
}

function baseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  return `https://${domain}`;
}

export async function postHeartbeat(
  truckId: number,
  token: string,
  payload: HeartbeatPayload,
): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/trucks/${truckId}/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    const err = new Error("NOT_LIVE");
    (err as any).code = "NOT_LIVE";
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Heartbeat failed: ${res.status} ${text}`);
  }
}
