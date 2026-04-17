import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl: icon, shadowUrl: iconShadow });

const SpotPin = L.divIcon({
  html: `<div style="
    width:28px;height:34px;
    display:flex;align-items:flex-start;justify-content:center;
  ">
    <div style="
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:#F47825;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(244,120,37,0.5);
    ">
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%) rotate(45deg);
        width:8px;height:8px;border-radius:50%;background:white;opacity:0.9;
      "></div>
    </div>
  </div>`,
  iconSize: [28, 34],
  iconAnchor: [14, 34],
  className: "",
});

interface SpotCardMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export function SpotCardMap({ lat, lng, className = "" }: SpotCardMapProps) {
  const [mounted, setMounted] = useState(false);
  const key = `${lat.toFixed(4)}-${lng.toFixed(4)}`;

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className={`bg-muted animate-pulse ${className}`} />;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ pointerEvents: "none" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        className="w-full h-full"
        key={key}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={SpotPin} />
      </MapContainer>
    </div>
  );
}
