import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import { StatusBadge } from "./StatusBadge";
import type { TruckSummary } from "@workspace/api-client-react";

// Fix Leaflet marker icons
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

interface MapViewProps {
  trucks: TruckSummary[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export function MapView({ trucks, center = [35.4676, -97.5164], zoom = 11, height = "500px" }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} className="w-full bg-muted rounded-xl animate-pulse" />;
  }

  // Filter trucks that have valid coordinates from their active schedule
  const mappedTrucks = trucks.filter(
    (t) => t.activeSchedule?.latitude && t.activeSchedule?.longitude
  );

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden shadow-lg border border-border/50">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedTrucks.map((truck) => (
          <Marker 
            key={truck.id} 
            position={[truck.activeSchedule!.latitude!, truck.activeSchedule!.longitude!]}
          >
            <Popup className="rounded-xl overflow-hidden p-0">
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div className="font-display font-bold text-base border-b pb-2">{truck.name}</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{truck.cuisine}</span>
                  <StatusBadge status={truck.status} isLive={truck.isLive} className="scale-75 origin-right" />
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  @ {truck.activeSchedule!.venueName}
                </div>
                <Link 
                  href={`/trucks/${truck.id}`}
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
