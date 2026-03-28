import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { X, Navigation, MapPin, Loader2, Wifi } from "lucide-react";

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
    width:32px;height:32px;border-radius:50%;
    background:#22c55e;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    position:relative;
  ">
    <div style="
      width:10px;height:10px;border-radius:50%;
      background:white;
    "></div>
    <div style="
      position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;
      border-radius:50%;border:2px solid #22c55e;
      animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
      opacity:0.6;
    "></div>
  </div>
  <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const OKC_CENTER: [number, number] = [35.4676, -97.5164];

function DraggableMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={LiveIcon}
      draggable
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const latlng = m.getLatLng();
            onChange([latlng.lat, latlng.lng]);
          }
        },
      }}
    />
  );
}

function MapClickHandler({ onClick }: { onClick: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
  }, [position, map]);
  return null;
}

interface CheckInMapModalProps {
  truckName: string;
  onConfirm: (lat: number, lng: number) => Promise<void>;
  onClose: () => void;
}

export function CheckInMapModal({ truckName, onConfirm, onClose }: CheckInMapModalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    setMounted(true);
    requestGps();
  }, []);

  const requestGps = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("GPS not available on this device.");
      setGpsLoading(false);
      setPosition(OKC_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setHasCentered(true);
        setRecenterKey((k) => k + 1);
        setGpsLoading(false);
      },
      (err) => {
        const msg =
          err.code === 1
            ? "Location access denied. Tap the map to set your spot manually."
            : "Could not get your location. Tap the map to set your spot.";
        setGpsError(msg);
        setPosition(OKC_CENTER);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (!position) return;
    setSubmitting(true);
    try {
      await onConfirm(position[0], position[1]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Go Live</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set your exact location so customers can find {truckName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: "340px" }}>
          {!mounted || !position ? (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">
                {gpsLoading ? "Getting your GPS location…" : "Loading map…"}
              </p>
            </div>
          ) : (
            <MapContainer
              center={position}
              zoom={16}
              scrollWheelZoom
              className="w-full h-full"
              key="checkin-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {hasCentered && <RecenterMap key={recenterKey} position={position} />}
              <DraggableMarker position={position} onChange={setPosition} />
              <MapClickHandler onClick={(p) => setPosition(p)} />
            </MapContainer>
          )}

          {/* GPS button overlay */}
          <button
            onClick={requestGps}
            disabled={gpsLoading}
            className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl shadow-md text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 text-primary" />
            )}
            {gpsLoading ? "Locating…" : "Use GPS"}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 space-y-3">
          {gpsError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {gpsError}
            </div>
          )}

          {position && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </span>
              <span className="ml-1 text-primary">· drag the pin or tap map to adjust</span>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!position || submitting || gpsLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
            {submitting ? "Going live…" : "Go Live Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
