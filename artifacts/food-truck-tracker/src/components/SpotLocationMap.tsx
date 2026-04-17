import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation } from "lucide-react";

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

interface SpotLocationMapProps {
  lat: number;
  lng: number;
  title: string;
  address?: string;
  city?: string;
  height?: string;
}

export function SpotLocationMap({ lat, lng, title, address, city, height = "208px" }: SpotLocationMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height }} className="rounded-3xl bg-muted animate-pulse flex items-center justify-center">
        <MapPin className="w-12 h-12 text-muted-foreground/30" />
      </div>
    );
  }

  const locationLabel = address ? `${address}, ${city ?? ""}` : city ?? "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;

  return (
    <div className="rounded-3xl overflow-hidden border border-border shadow-sm relative" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        className="w-full h-full"
        key={`${lat}-${lng}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={SpotPin}>
          <Popup>
            <div className="font-semibold text-sm">{title}</div>
            {locationLabel && <div className="text-xs text-gray-500 mt-0.5">{locationLabel}</div>}
          </Popup>
        </Marker>
      </MapContainer>

      {/* Location label bottom-left */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-sm max-w-[65%]">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground truncate">
          {locationLabel || title}
        </span>
      </div>

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
