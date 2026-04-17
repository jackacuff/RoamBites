import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Loader2 } from "lucide-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const SpotPin = L.divIcon({
  html: `<div style="
    position:relative;
    width:36px;height:44px;
    display:flex;align-items:flex-start;justify-content:center;
  ">
    <div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:#F47825;border:3px solid white;
      box-shadow:0 3px 12px rgba(244,120,37,0.45);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="transform:rotate(45deg);width:12px;height:12px;border-radius:50%;background:white;opacity:0.9;"></div>
    </div>
  </div>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -48],
  className: "",
});

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

interface SpotLocationMapProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  city?: string;
  title: string;
  height?: string;
}

type MapState =
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error" };

export function SpotLocationMap({ lat, lng, address, city, title, height = "220px" }: SpotLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapState, setMapState] = useState<MapState>({ status: "loading" });

  const locationLabel = [address, city].filter(Boolean).join(", ");

  useEffect(() => {
    setMounted(true);

    if (lat && lng) {
      setMapState({ status: "ready", lat, lng });
      return;
    }

    const query = [address, city, "Oklahoma"].filter(Boolean).join(", ");
    if (!query.trim()) { setMapState({ status: "error" }); return; }

    geocodeAddress(query).then(coords => {
      if (coords) {
        setMapState({ status: "ready", lat: coords.lat, lng: coords.lng });
      } else {
        setMapState({ status: "error" });
      }
    });
  }, [lat, lng, address, city]);

  if (!mounted || mapState.status === "loading") {
    return (
      <div style={{ height }} className="rounded-3xl bg-muted animate-pulse flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-muted-foreground/40 animate-spin" />
        <span className="text-xs text-muted-foreground/50">Loading map…</span>
      </div>
    );
  }

  if (mapState.status === "error") {
    return (
      <div style={{ height }} className="rounded-3xl bg-muted/60 border border-border flex flex-col items-center justify-center gap-2">
        <MapPin className="w-10 h-10 text-primary/20" />
        {locationLabel && <p className="text-sm text-muted-foreground">{locationLabel}</p>}
      </div>
    );
  }

  const { lat: resolvedLat, lng: resolvedLng } = mapState;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel || title)}`;

  return (
    <div className="rounded-3xl overflow-hidden border border-border shadow-sm relative" style={{ height }}>
      <MapContainer
        center={[resolvedLat, resolvedLng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        className="w-full h-full"
        key={`${resolvedLat}-${resolvedLng}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[resolvedLat, resolvedLng]} icon={SpotPin}>
          <Popup>
            <div className="font-semibold text-sm">{title}</div>
            {locationLabel && <div className="text-xs text-gray-500 mt-0.5">{locationLabel}</div>}
          </Popup>
        </Marker>
      </MapContainer>

      {/* Location label bottom-left */}
      {locationLabel && (
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-sm max-w-[65%]">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">{locationLabel}</span>
        </div>
      )}

      {/* Directions button top-right */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-md hover:bg-primary/90 transition-colors"
      >
        <Navigation className="w-3.5 h-3.5" />
        Directions
      </a>
    </div>
  );
}
