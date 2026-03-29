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

// Small dot for scheduled (non-favorite)
function makeScheduledIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
    className: "",
  });
}

// Small pulsing dot for live (non-favorite)
function makeLiveIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:16px;height:16px;">
        <div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.4);position:relative;z-index:1;"></div>
        <div style="position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;border-radius:50%;border:2px solid #22c55e;animation:lp 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div>
      </div>
      <style>@keyframes lp{75%,100%{transform:scale(2.2);opacity:0}}</style>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
    className: "",
  });
}

// Heart SVG path (standard heart, tip at bottom-center)
const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function heartSvgHtml(fill: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 23" width="30" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));display:block;">
    <path d="${heartPath}" fill="${fill}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

// Heart pin for favorited + scheduled
function makeFavScheduledIcon() {
  return L.divIcon({
    html: heartSvgHtml("#ef4444"),
    iconSize: [30, 28],
    iconAnchor: [15, 26],
    popupAnchor: [0, -28],
    className: "",
  });
}

// Heart pin with green pulse for favorited + live
function makeFavLiveIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:38px;height:36px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;border-radius:50%;border:2.5px solid #22c55e;animation:lp 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.65;"></div>
        <div style="position:relative;z-index:1;margin-top:4px;">
          ${heartSvgHtml("#ef4444")}
        </div>
      </div>
      <style>@keyframes lp{75%,100%{transform:scale(1.9);opacity:0}}</style>`,
    iconSize: [38, 36],
    iconAnchor: [19, 32],
    popupAnchor: [0, -34],
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
  const favIndicator = pin.isFavorite
    ? `<span style="margin-left:4px;font-size:12px;" title="In your favorites">❤️</span>`
    : "";
  const liveBadge = pin.isLiveGps
    ? `<span style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;white-space:nowrap;">Live</span>`
    : `<span style="background:#ffedd5;color:#c2410c;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;white-space:nowrap;">Scheduled</span>`;
  const slug = (pin.truck as any).slug ?? pin.truck.id;
  return `
    <style>@keyframes lp2{0%,100%{opacity:1}50%{opacity:0.4}}</style>
    <div style="min-width:180px;padding:2px 2px 4px;font-family:system-ui,sans-serif;">
      <div style="font-weight:700;font-size:13px;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:2px;flex-wrap:wrap;">
        ${liveIndicator}${pin.truck.name}${favIndicator}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:11px;color:#6b7280;">${pin.truck.cuisine}</span>
        ${liveBadge}
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">@ ${pin.locationLabel}</div>
      <div style="display:flex;gap:6px;">
        <a href="/trucks/${slug}"
          style="flex:1;text-align:center;background:#f97316;color:white;padding:6px 0;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
          View Truck →
        </a>
        <a href="https://maps.apple.com/?daddr=${pin.lat},${pin.lng}&dirflg=d" target="_blank" rel="noopener noreferrer"
          style="flex:1;text-align:center;background:#e5e7eb;color:#374151;padding:6px 0;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Directions
        </a>
      </div>
    </div>`;
}

function ClusteredMarkers({ pins }: { pins: PinEntry[] }) {
  const map = useMap();

  useEffect(() => {
    const mcg = (L as any).markerClusterGroup({
      maxClusterRadius: 30,
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
      let pinIcon: L.DivIcon | L.Icon;
      if (pin.isFavorite) {
        pinIcon = pin.isLiveGps ? makeFavLiveIcon() : makeFavScheduledIcon();
      } else {
        pinIcon = pin.isLiveGps ? makeLiveIcon() : makeScheduledIcon();
      }
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
