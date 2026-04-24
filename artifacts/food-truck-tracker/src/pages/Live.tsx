import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { Link } from "wouter";
import { useLiveTrucks, type LiveTruck } from "@/hooks/useLiveTrucks";

const DEFAULT_CENTER: [number, number] = [35.4676, -97.5164];
const DEFAULT_ZOOM = 11;

function livePinIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:18px;height:18px;">
        <div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);position:relative;z-index:1;"></div>
        <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;border:2px solid #22c55e;animation:rb-live-pulse 1.6s cubic-bezier(0,0,0.2,1) infinite;opacity:0.7;"></div>
      </div>
      <style>@keyframes rb-live-pulse{75%,100%{transform:scale(2.4);opacity:0}}</style>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
    className: "",
  });
}

function FitToTrucks({ trucks }: { trucks: LiveTruck[] }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (didFitRef.current || trucks.length === 0) return;
    const bounds: LatLngBoundsExpression = trucks.map(
      (t) => [t.latitude, t.longitude] as [number, number],
    );
    if (trucks.length === 1) {
      map.setView(bounds[0] as [number, number], 14, { animate: false });
    } else {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: false });
    }
    didFitRef.current = true;
  }, [map, trucks]);

  return null;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "just now";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function Live() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useLiveTrucks();
  const trucks = useMemo(() => data ?? [], [data]);
  const now = useNow(1000);
  const updatedAgoSec = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = window.location.href;
    const text = `${trucks.length} food truck${trucks.length === 1 ? "" : "s"} live right now on RoamBites`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "RoamBites Live", text, url });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // noop
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToTrucks trucks={trucks} />
        {trucks.map((t) => (
          <Marker key={t.id} position={[t.latitude, t.longitude]} icon={livePinIcon()}>
            <Popup>
              <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  {t.cuisine} · updated {formatAgo(t.locationUpdatedAt)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link
                    href={`/trucks/${t.slug ?? t.id}`}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      background: "#f97316",
                      color: "white",
                      padding: "6px 0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    View truck →
                  </Link>
                  <a
                    href={`https://maps.apple.com/?daddr=${t.latitude},${t.longitude}&dirflg=d`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      background: "#e5e7eb",
                      color: "#374151",
                      padding: "6px 0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 12px)",
          left: "calc(env(safe-area-inset-left, 0px) + 12px)",
          right: "calc(env(safe-area-inset-right, 0px) + 12px)",
          zIndex: 1000,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            background: "white",
            borderRadius: 999,
            padding: "8px 14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "system-ui, sans-serif",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#22c55e",
              boxShadow: "0 0 0 3px rgba(34,197,94,0.25)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
            RoamBites Live
          </span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {isLoading ? "loading…" : `· ${trucks.length}`}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", pointerEvents: "none" }}>
          <div
            style={{
              pointerEvents: "auto",
              background: "white",
              borderRadius: 999,
              padding: "8px 12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              fontSize: 12,
              color: "#6b7280",
              fontFamily: "system-ui, sans-serif",
              whiteSpace: "nowrap",
            }}
            title="Auto-refreshes every 30 seconds"
          >
            {isFetching ? "refreshing…" : `${updatedAgoSec}s ago`}
          </div>

          <button
            type="button"
            onClick={onShare}
            style={{
              pointerEvents: "auto",
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
              minHeight: 36,
            }}
          >
            {copied ? "copied" : "share"}
          </button>
        </div>
      </div>

      {!isLoading && trucks.length === 0 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            background: "white",
            borderRadius: 16,
            padding: "18px 22px",
            maxWidth: 320,
            textAlign: "center",
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 6 }}>
            No trucks live right now
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.4 }}>
            This page auto-refreshes. When a vendor taps <strong>Go Live</strong>, their pin shows up here.
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              marginTop: 12,
              background: "#f97316",
              color: "white",
              border: "none",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Refresh now
          </button>
        </div>
      )}
    </div>
  );
}
