import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { TruckSummary } from "@workspace/api-client-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
});
L.Marker.prototype.options.icon = DefaultIcon;

const heartBadge = `<div style="
  position:absolute;top:-6px;right:-6px;
  font-size:11px;line-height:1;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,0.3));
  pointer-events:none;
">❤️</div>`;

function makeScheduledIcon(fav: boolean) {
  return L.divIcon({
    html: `<div style="position:relative;width:${fav ? 20 : 14}px;height:${fav ? 20 : 14}px;">
      <div style="
        width:14px;height:14px;border-radius:50%;
        background:#f97316;border:2.5px solid white;
        box-shadow:0 1px 5px rgba(0,0,0,0.4);
      "></div>
      ${fav ? heartBadge : ""}
    </div>`,
    iconSize: fav ? [20, 20] : [14, 14],
    iconAnchor: fav ? [7, 7] : [7, 7],
    popupAnchor: [0, -12],
    className: "",
  });
}

function makeLiveIcon(fav: boolean) {
  return L.divIcon({
    html: `<div style="position:relative;width:${fav ? 22 : 16}px;height:${fav ? 22 : 16}px;">
      <div style="
        width:16px;height:16px;border-radius:50%;
        background:#22c55e;border:2.5px solid white;
        box-shadow:0 1px 6px rgba(0,0,0,0.4);
        position:relative;z-index:1;
      "></div>
      <div style="
        position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;
        border-radius:50%;border:2px solid #22c55e;
        animation:lp 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;
      "></div>
      ${fav ? heartBadge : ""}
    </div>
    <style>@keyframes lp{75%,100%{transform:scale(2.2);opacity:0}}</style>`,
    iconSize: fav ? [22, 22] : [16, 16],
    iconAnchor: fav ? [8, 8] : [8, 8],
    popupAnchor: [0, -14],
    className: "",
  });
}

interface PinEntry {
  truck: TruckSummary;
  lat: number;
  lng: number;
  isLiveGps: boolean;
  isFavorite: boolean;
  locationLabel: string;
}

function buildPins(trucks: TruckSummary[], favIds: Set<number>): PinEntry[] {
  const pins: PinEntry[] = [];
  for (const truck of trucks) {
    const isFavorite = favIds.has(truck.id);
    const lat = truck.currentLatitude;
    const lng = truck.currentLongitude;
    if (truck.isLive && typeof lat === "number" && typeof lng === "number") {
      pins.push({ truck, lat, lng, isLiveGps: true, isFavorite, locationLabel: truck.currentLocation || "Live now" });
    } else if (truck.activeSchedule?.latitude && truck.activeSchedule?.longitude) {
      pins.push({
        truck,
        lat: truck.activeSchedule.latitude,
        lng: truck.activeSchedule.longitude,
        isLiveGps: false,
        isFavorite,
        locationLabel: truck.activeSchedule.venueName ?? "Scheduled stop",
      });
    }
  }
  return pins;
}

function popupHtml(pin: PinEntry): string {
  const liveIndicator = pin.isLiveGps
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:5px;vertical-align:middle;animation:lp2 1.5s infinite;"></span>`
    : "";
  const heartMark = pin.isFavorite
    ? `<span style="margin-left:4px;" title="In your favorites">❤️</span>`
    : "";
  const liveBadge = pin.isLiveGps
    ? `<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;white-space:nowrap;">Live</span>`
    : `<span style="background:#ffedd5;color:#c2410c;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;white-space:nowrap;">Scheduled</span>`;
  const slug = (pin.truck as any).slug ?? pin.truck.id;
  return `
    <style>@keyframes lp2{0%,100%{opacity:1}50%{opacity:0.4}}</style>
    <div style="min-width:180px;padding:2px 2px 4px;font-family:system-ui,sans-serif;">
      <div style="font-weight:700;font-size:13px;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:4px;">
        ${liveIndicator}${pin.truck.name}${heartMark}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:11px;color:#6b7280;">${pin.truck.cuisine}</span>
        ${liveBadge}
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">@ ${pin.locationLabel}</div>
      <a href="/trucks/${slug}"
        style="display:block;width:100%;text-align:center;background:#f97316;color:white;padding:6px 0;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
        View Truck →
      </a>
    </div>`;
}

function ClusteredMarkers({ pins }: { pins: PinEntry[] }) {
  const map = useMap();

  useEffect(() => {
    const mcg = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 30 : count < 50 ? 36 : 42;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:#f97316;border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${count < 10 ? 13 : 11}px;
            font-family:system-ui,sans-serif;
          ">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: "",
        });
      },
    });

    for (const pin of pins) {
      const pinIcon = pin.isLiveGps
        ? makeLiveIcon(pin.isFavorite)
        : makeScheduledIcon(pin.isFavorite);
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIcon });
      marker.bindPopup(popupHtml(pin), { maxWidth: 240 });
      mcg.addLayer(marker);
    }

    map.addLayer(mcg);
    return () => { map.removeLayer(mcg); };
  }, [map, pins]);

  return null;
}

interface MapViewProps {
  trucks: TruckSummary[];
  favoriteTruckIds?: Set<number>;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export function MapView({
  trucks,
  favoriteTruckIds = new Set(),
  center = [35.4676, -97.5164],
  zoom = 11,
  height = "500px",
}: MapViewProps) {
  const pins = buildPins(trucks, favoriteTruckIds);

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden shadow-lg border border-border/50">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusteredMarkers pins={pins} />
      </MapContainer>
    </div>
  );
}
