import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";

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

const LiveIcon = L.divIcon({
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#22c55e;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    position:relative;
  ">
    <div style="width:8px;height:8px;border-radius:50%;background:white;"></div>
    <div style="
      position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;
      border-radius:50%;border:2px solid #22c55e;
      animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;
    "></div>
  </div>
  <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "",
});

interface LiveMiniMapProps {
  lat: number;
  lng: number;
  truckName: string;
  height?: string;
}

export function LiveMiniMap({ lat, lng, truckName, height = "180px" }: LiveMiniMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} className="rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-green-200 shadow-sm" style={{ height }}>
      <div className="relative h-full">
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          className="w-full h-full"
          key={`${lat}-${lng}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} icon={LiveIcon}>
            <Popup>
              <div className="font-semibold text-sm">{truckName}</div>
              <div className="text-xs text-gray-500 mt-1">Live now</div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Overlay label */}
        <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm border border-green-200 rounded-lg shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-green-800">{truckName} is live here</span>
        </div>

        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 z-[1000] flex items-center gap-1 px-2 py-1 bg-white/90 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground shadow-sm"
        >
          <MapPin className="w-3 h-3" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}
