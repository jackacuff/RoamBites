import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import { StatusBadge } from "./StatusBadge";
import type { TruckSummary } from "@workspace/api-client-react";

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

interface MapViewProps {
  trucks: TruckSummary[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

type PinEntry = {
  truck: TruckSummary;
  lat: number;
  lng: number;
  isLiveGps: boolean;
  locationLabel: string;
};

export function MapView({ trucks, center = [35.4676, -97.5164], zoom = 11, height = "500px" }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} className="w-full bg-muted rounded-xl animate-pulse" />;
  }

  const pins: PinEntry[] = [];

  for (const truck of trucks) {
    const lat = truck.currentLatitude;
    const lng = truck.currentLongitude;

    if (truck.isLive && typeof lat === "number" && typeof lng === "number") {
      pins.push({
        truck,
        lat,
        lng,
        isLiveGps: true,
        locationLabel: truck.currentLocation || "Live now",
      });
    } else if (truck.activeSchedule?.latitude && truck.activeSchedule?.longitude) {
      pins.push({
        truck,
        lat: truck.activeSchedule.latitude,
        lng: truck.activeSchedule.longitude,
        isLiveGps: false,
        locationLabel: truck.activeSchedule.venueName ?? "Scheduled stop",
      });
    }
  }

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden shadow-lg border border-border/50">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map(({ truck, lat, lng, isLiveGps, locationLabel }) => (
          <Marker
            key={`${truck.id}-${isLiveGps ? "live" : "sched"}`}
            position={[lat, lng]}
            icon={isLiveGps ? LiveIcon : DefaultIcon}
          >
            <Popup className="rounded-xl overflow-hidden p-0">
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div className="font-display font-bold text-base border-b pb-2 flex items-center gap-1.5">
                  {isLiveGps && (
                    <span className="inline-flex w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  )}
                  {truck.name}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{truck.cuisine}</span>
                  <StatusBadge status={truck.status} isLive={truck.isLive} className="scale-75 origin-right" />
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  @ {locationLabel}
                </div>
                <Link
                  href={`/trucks/${truck.slug ?? truck.id}`}
                  className="mt-2 block w-full text-center bg-primary text-primary-foreground py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  View Truck
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
