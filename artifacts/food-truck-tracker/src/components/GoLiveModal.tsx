import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { format, addMinutes } from "date-fns";
import { X, Wifi, Clock, MapPin, AlertTriangle, Calendar, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const MapContainer = lazy(() => import("react-leaflet").then(m => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import("react-leaflet").then(m => ({ default: m.TileLayer })));
const Marker = lazy(() => import("react-leaflet").then(m => ({ default: m.Marker })));

import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useMapEvents } from "react-leaflet";

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const LiveIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;position:relative;"><div style="width:8px;height:8px;border-radius:50%;background:white;"></div><div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;border:2px solid #22c55e;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div></div><style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "",
});

const OKC_CENTER: [number, number] = [35.4676, -97.5164];

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
  { label: "4 hr", minutes: 240 },
  { label: "Custom", minutes: -1 },
];

function MapClickHandler({ onClick }: { onClick: (pos: [number, number]) => void }) {
  useMapEvents({ click(e) { onClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

function DraggableMarker({ position, onChange }: { position: [number, number]; onChange: (p: [number, number]) => void }) {
  const ref = useRef<L.Marker>(null);
  return (
    <Marker ref={ref} position={position} icon={LiveIcon} draggable eventHandlers={{
      dragend() {
        const m = ref.current;
        if (m) { const ll = m.getLatLng(); onChange([ll.lat, ll.lng]); }
      }
    }} />
  );
}

export interface ScheduleWindow {
  id: number;
  venueName: string;
  startDateTime: string;
  endDateTime: string;
}

interface GoLiveModalProps {
  truckName: string;
  todaySchedules: ScheduleWindow[];
  onConfirm: (params: {
    lat?: number;
    lng?: number;
    liveUntil: Date;
    liveOutsideSchedule: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

export function GoLiveModal({ truckName, todaySchedules, onConfirm, onClose }: GoLiveModalProps) {
  const now = new Date();

  const activeWindow = todaySchedules.find(s =>
    new Date(s.startDateTime) <= now && new Date(s.endDateTime) >= now
  );
  const isInSchedule = !!activeWindow;

  const [selectedMinutes, setSelectedMinutes] = useState<number>(activeWindow
    ? Math.min(240, Math.max(30, Math.round((new Date(activeWindow.endDateTime).getTime() - now.getTime()) / 60000)))
    : 60
  );
  const [customTime, setCustomTime] = useState<string>(() => {
    const end = addMinutes(now, 60);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  });
  const [isCustom, setIsCustom] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);

  const [showWarning, setShowWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showMap && !mapMounted) setMapMounted(true);
  }, [showMap, mapMounted]);

  const getLiveUntil = (): Date | null => {
    if (isCustom) {
      const [h, m] = customTime.split(":").map(Number);
      const end = new Date(now);
      end.setHours(h, m, 0, 0);
      if (end <= now) return null;
      return end;
    }
    return addMinutes(now, selectedMinutes);
  };

  const liveUntil = getLiveUntil();
  const liveUntilLabel = liveUntil ? format(liveUntil, "h:mm a") : null;

  const requestGps = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) { setGpsLoading(false); setMapPosition(OKC_CENTER); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setMapPosition([pos.coords.latitude, pos.coords.longitude]); setGpsLoading(false); },
      () => { setMapPosition(OKC_CENTER); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShowMap = () => {
    setShowMap(true);
    if (!mapPosition) requestGps();
  };

  const handlePrimaryAction = () => {
    if (!liveUntil) return;
    if (!isInSchedule && !showWarning) {
      setShowWarning(true);
      return;
    }
    doConfirm();
  };

  const doConfirm = async () => {
    if (!liveUntil || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        lat: mapPosition?.[0],
        lng: mapPosition?.[1],
        liveUntil,
        liveOutsideSchedule: !isInSchedule,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-600" /> Go Live
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{truckName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Schedule status */}
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isInSchedule ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <Calendar className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isInSchedule ? 'text-green-600' : 'text-amber-600'}`} />
            <div>
              {isInSchedule ? (
                <>
                  <p className="text-sm font-semibold text-green-800">You're scheduled right now</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {activeWindow!.venueName} · until {format(new Date(activeWindow!.endDateTime), "h:mm a")}
                  </p>
                </>
              ) : todaySchedules.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-amber-800">No stop scheduled for this moment</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Next: {format(new Date(todaySchedules[0].startDateTime), "h:mm a")} · {todaySchedules[0].venueName}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-800">No stops scheduled today</p>
                  <p className="text-xs text-amber-700 mt-0.5">You can still go live manually</p>
                </>
              )}
            </div>
          </div>

          {/* Duration section */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              How long will you be open?
            </p>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    if (opt.minutes === -1) {
                      setIsCustom(true);
                      setSelectedMinutes(-1);
                    } else {
                      setIsCustom(false);
                      setSelectedMinutes(opt.minutes);
                    }
                  }}
                  className={`py-2 rounded-xl border text-sm font-medium transition-colors ${
                    (opt.minutes === -1 ? isCustom : !isCustom && selectedMinutes === opt.minutes)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {isCustom && (
              <div className="mt-3">
                <label className="block text-xs text-muted-foreground mb-1">End time today</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={e => setCustomTime(e.target.value)}
                  className="px-3 py-2 border border-input rounded-xl bg-background text-foreground text-sm w-40"
                />
              </div>
            )}

            {liveUntil ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className="text-muted-foreground">Live until</span>
                <span className="font-semibold text-green-700">{liveUntilLabel}</span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-destructive">End time must be in the future</p>
            )}
          </div>

          {/* Location section (collapsible) */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => (showMap ? setShowMap(false) : handleShowMap())}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pin your location
                {mapPosition && (
                  <span className="text-xs text-green-600 font-normal">· set</span>
                )}
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </span>
              {showMap ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showMap && (
              <div className="relative" style={{ height: 260 }}>
                {!mapMounted || !mapPosition ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {gpsLoading ? "Getting GPS…" : "Loading map…"}
                  </div>
                ) : (
                  <Suspense fallback={
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
                    </div>
                  }>
                    <MapContainer center={mapPosition} zoom={16} scrollWheelZoom className="w-full h-full" key="go-live-map">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <DraggableMarker position={mapPosition} onChange={setMapPosition} />
                      <MapClickHandler onClick={p => setMapPosition(p)} />
                    </MapContainer>
                  </Suspense>
                )}
                {mapPosition && (
                  <div className="absolute bottom-2 left-2 right-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 z-[400]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {mapPosition[0].toFixed(5)}, {mapPosition[1].toFixed(5)} · drag pin or tap to adjust
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule mismatch warning (step 2) */}
          {showWarning && !isInSchedule && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">You're not scheduled right now</p>
                <p className="text-sm text-amber-800 mt-0.5">
                  Your schedule doesn't show a stop for this time. Customers may be confused. Go live anyway?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
          {showWarning && !isInSchedule ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doConfirm}
                disabled={!liveUntil || submitting}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                {submitting ? "Going live…" : "Go Live Anyway"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!liveUntil || submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
              {submitting ? "Going live…" : `Go Live${liveUntilLabel ? ` · until ${liveUntilLabel}` : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
