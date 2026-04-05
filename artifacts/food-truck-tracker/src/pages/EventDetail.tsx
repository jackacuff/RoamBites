import { useParams, Link } from "wouter";
import { useGetEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Clock, FileText, Globe, ExternalLink, Share2, Check, ChevronRight, X, ChevronLeft, ImageIcon, Phone, Mail, Zap, DollarSign } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function useShareEvent() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const share = async (name: string, description: string | null | undefined, eventId: number) => {
    const url = `${window.location.origin}/events/${eventId}`;
    const shareData = { title: name, text: description ? `${description} — RoamBites` : `Check out this food truck event on RoamBites`, url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied!", description: "Event link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };
  return { share, copied };
}

function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const requested = sessionStorage.getItem("roambites_location_requested");
    if (requested === "denied") return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        sessionStorage.setItem("roambites_location_requested", "granted");
      },
      () => { sessionStorage.setItem("roambites_location_requested", "denied"); },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);
  return location;
}

interface EventTruck {
  id: number;
  status: string;
  truck?: {
    id: number;
    name: string;
    cuisine: string | null;
    description: string | null;
    logoUrl: string | null;
    imageUrl: string | null;
    isLive?: boolean;
  } | null;
}

function EventMapLeaflet({
  lat, lng, venueName, trucks, selectedTruckId, onTruckSelect, userLocation,
}: {
  lat: number; lng: number; venueName: string;
  trucks: EventTruck[]; selectedTruckId: number | null;
  onTruckSelect: (id: number | null) => void;
  userLocation: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = L.default.map(mapRef.current!, { center: [lat, lng], zoom: 15, zoomControl: true });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      const venueIcon = L.default.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:12px;">📍</span></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      L.default.marker([lat, lng], { icon: venueIcon })
        .addTo(map)
        .bindPopup(`<strong style="font-size:13px">${venueName}</strong><br/><span style="color:#888;font-size:11px">Event Venue</span>`);
      leafletMapRef.current = map;
      setMapReady(true);
    });
    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      setMapReady(false);
    };
  }, [lat, lng, venueName]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const confirmedTrucks = trucks.filter((et) => et.status === "confirmed" && et.truck);
      confirmedTrucks.forEach((et, i) => {
        const truck = et.truck!;
        const count = confirmedTrucks.length;
        const angle = count > 1 ? (i / count) * 2 * Math.PI : 0;
        const radius = count > 1 ? 0.0006 : 0;
        const tLat = lat + radius * Math.cos(angle);
        const tLng = lng + radius * Math.sin(angle);
        const isSelected = truck.id === selectedTruckId;
        const icon = L.default.divIcon({
          className: "",
          html: `<div style="
            width:${isSelected ? 26 : 20}px;height:${isSelected ? 26 : 20}px;
            border-radius:50%;
            background:${isSelected ? "#16a34a" : "#f97316"};
            border:${isSelected ? "3px" : "2px"} solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:all 0.2s;
          "><span style="color:white;font-size:${isSelected ? 11 : 9}px;">🚛</span></div>`,
          iconSize: [isSelected ? 26 : 20, isSelected ? 26 : 20],
          iconAnchor: [isSelected ? 13 : 10, isSelected ? 13 : 10],
        });
        const marker = L.default.marker([tLat, tLng], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:150px">
              <strong style="font-size:13px">${truck.name}</strong>
              ${truck.cuisine ? `<div style="color:#888;font-size:11px;margin-top:2px">${truck.cuisine}</div>` : ""}
              <a href="/trucks/${truck.id}" style="display:block;margin-top:8px;font-size:11px;color:#f97316;font-weight:600">View Truck →</a>
            </div>
          `);
        marker.on("click", () => onTruckSelect(isSelected ? null : truck.id));
        if (isSelected) marker.openPopup();
        markersRef.current.push(marker);
      });
    });
  }, [trucks, selectedTruckId, mapReady, lat, lng, onTruckSelect]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !userLocation) return;
    import("leaflet").then((L) => {
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
      const icon = L.default.divIcon({
        className: "",
        html: `<div style="position:relative;width:16px;height:16px">
          <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.3;animation:ping 1.5s ease-in-out infinite"></div>
          <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
        </div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.default.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(leafletMapRef.current!)
        .bindPopup("You are here");
    });
  }, [userLocation, mapReady]);

  return <div ref={mapRef} className="w-full h-full" />;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useGetEvent(Number(id) || 0, {
    query: { enabled: !!id }
  });
  const [selectedTruckId, setSelectedTruckId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { share, copied } = useShareEvent();
  const userLocation = useUserLocation();
  const lineupRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();

  const canSeeLogistics = isAuthenticated && (
    user?.role === "organizer" || user?.role === "vendor" ||
    user?.role === "admin" || user?.role === "superadmin"
  );

  const scrollToTruck = (truckId: number) => {
    setSelectedTruckId(truckId);
    setTimeout(() => {
      const el = document.getElementById(`truck-card-${truckId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;
  if (!event) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Event Not Found</h1>
          <Link href="/events" className="text-primary hover:underline mt-4 inline-block">← Back to Events</Link>
        </div>
      </Layout>
    );
  }

  const confirmedTrucks = event.trucks.filter((t: EventTruck) => t.status === "confirmed");
  const now = new Date();
  const isOngoing = new Date(event.startDateTime) <= now && new Date(event.endDateTime) >= now;
  const isUpcoming = new Date(event.startDateTime) > now;

  const photoGallery: string[] = (() => {
    const raw = (event as any).photoUrls;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch {}
    return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
  })();

  const lightboxUrl = lightboxIndex !== null ? photoGallery[lightboxIndex] : null;

  return (
    <Layout>
      <style>{`@keyframes ping { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.8);opacity:0.1} }`}</style>

      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        {(event as any).bannerImageUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${(event as any).bannerImageUrl})` }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary" />
        )}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="mb-4">
            <Link href="/events" className="text-white/70 hover:text-white text-sm">← All Events</Link>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {isOngoing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />Happening Now
                  </span>
                )}
                {isUpcoming && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">Upcoming</span>
                )}
              </div>
              <button
                onClick={() => share(event.name, event.description, event.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-white leading-tight">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.venueName}, {event.city}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{format(new Date(event.startDateTime), "EEEE, MMMM d, yyyy")}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{confirmedTrucks.length} truck{confirmedTrucks.length !== 1 ? "s" : ""} confirmed</span>
            </div>
            {(event as any).websiteUrl && (
              <a href={(event as any).websiteUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm">
                <Globe className="w-4 h-4" />Event Website<ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery Strip */}
      {photoGallery.length > 0 && (
        <div className="bg-card border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Event Photos</h2>
              <span className="text-xs text-muted-foreground">({photoGallery.length})</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {photoGallery.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="shrink-0 snap-start w-40 h-28 rounded-xl overflow-hidden border border-border hover:border-primary/60 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <img
                    src={url}
                    alt={`Event photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details + Map */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Event Details</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Date</p>
                    <p className="text-muted-foreground text-sm">{format(new Date(event.startDateTime), "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Time</p>
                    <p className="text-muted-foreground text-sm">
                      {format(new Date(event.startDateTime), "h:mm a")} – {format(new Date(event.endDateTime), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Venue</p>
                    <p className="text-muted-foreground text-sm">{event.venueName}</p>
                    {event.address && <p className="text-muted-foreground text-sm">{event.address}</p>}
                    <p className="text-muted-foreground text-sm">{event.city}</p>
                  </div>
                </div>
                {event.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">About</p>
                      <p className="text-muted-foreground text-sm">{event.description}</p>
                    </div>
                  </div>
                )}
                {(event as any).publicNotes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                    <p className="text-sm text-amber-800">{(event as any).publicNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Logistics section for organizers/vendors/admins */}
            {canSeeLogistics && (
              (() => {
                const ev = event as any;
                const hasContact = ev.contactFirstName || ev.contactEmail || ev.contactPhone;
                const hasLogistics = ev.availableHookups || ev.vendorFeeStructure;
                const hasVendorNotes = ev.vendorNotes;
                if (!hasContact && !hasLogistics && !hasVendorNotes) return null;

                const hookupLabels: Record<string, string> = {
                  water_electric: "Water + Electric",
                  water_only: "Water only",
                  electric_only: "Electric only",
                  none: "None",
                  unknown: "Not specified",
                };
                const feeLabels: Record<string, string> = {
                  none: "Free to participate",
                  flat: `Flat fee: $${ev.spotFeeAmount ?? "—"}`,
                  percentage: `${ev.spotFeeAmount ?? "—"}% of sales`,
                };
                return (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-border bg-muted/20">
                      <h2 className="font-semibold text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" /> Event Logistics
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Visible to organizers and vendors only</p>
                    </div>
                    <div className="p-5 space-y-4">
                      {hasContact && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
                          <div className="space-y-1.5">
                            {(ev.contactFirstName || ev.contactLastName) && (
                              <p className="text-sm text-foreground font-medium">{[ev.contactFirstName, ev.contactLastName].filter(Boolean).join(" ")}</p>
                            )}
                            {ev.contactEmail && (
                              <a href={`mailto:${ev.contactEmail}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <Mail className="w-3.5 h-3.5" /> {ev.contactEmail}
                              </a>
                            )}
                            {ev.contactPhone && (
                              <a href={`tel:${ev.contactPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                <Phone className="w-3.5 h-3.5" /> {ev.contactPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {hasLogistics && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Setup</p>
                          <div className="space-y-1.5">
                            {ev.availableHookups && ev.availableHookups !== "unknown" && (
                              <div className="flex items-center gap-2 text-sm">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-muted-foreground">Hookups:</span>
                                <span className="text-foreground font-medium">{hookupLabels[ev.availableHookups] ?? ev.availableHookups}</span>
                              </div>
                            )}
                            {ev.vendorFeeStructure && (
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-muted-foreground">Fee:</span>
                                <span className="text-foreground font-medium">{feeLabels[ev.vendorFeeStructure] ?? ev.vendorFeeStructure}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {hasVendorNotes && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <p className="text-xs font-semibold text-primary mb-1">Vendor Notes</p>
                          <p className="text-sm text-foreground">{ev.vendorNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            {event.latitude && event.longitude && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Location & Trucks
                  </h2>
                  {confirmedTrucks.length > 0 && (
                    <span className="text-xs text-muted-foreground">{confirmedTrucks.length} truck pin{confirmedTrucks.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="h-64">
                  <EventMapLeaflet
                    lat={event.latitude}
                    lng={event.longitude}
                    venueName={event.venueName}
                    trucks={event.trucks as EventTruck[]}
                    selectedTruckId={selectedTruckId}
                    onTruckSelect={scrollToTruck}
                    userLocation={userLocation}
                  />
                </div>
                {confirmedTrucks.length > 0 && (
                  <div className="px-4 py-2 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground">🟠 Truck pins &nbsp;•&nbsp; 📍 Venue &nbsp;{userLocation ? <>•&nbsp; 🔵 You</> : ""}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Truck Lineup */}
          <div className="lg:col-span-2" ref={lineupRef}>
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">Food Truck Lineup</h2>
              {confirmedTrucks.length > 0 ? (
                <p className="text-muted-foreground text-sm">{confirmedTrucks.length} truck{confirmedTrucks.length !== 1 ? "s" : ""} confirmed{event.latitude ? " · Click a card to highlight on map" : ""}</p>
              ) : (
                <p className="text-muted-foreground text-sm">Trucks being finalized — check back soon!</p>
              )}
            </div>

            {confirmedTrucks.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {confirmedTrucks.map((et: EventTruck) => {
                  const truck = et.truck;
                  if (!truck) return null;
                  const isSelected = truck.id === selectedTruckId;
                  return (
                    <div
                      key={et.id}
                      id={`truck-card-${truck.id}`}
                      onClick={() => setSelectedTruckId(isSelected ? null : truck.id)}
                      className={`group bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary shadow-lg ring-2 ring-primary/15"
                          : "border-border hover:border-primary/40 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        {truck.logoUrl || truck.imageUrl ? (
                          <img
                            src={truck.logoUrl || truck.imageUrl || ""}
                            alt={truck.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                            {truck.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className={`font-bold text-base transition-colors ${isSelected ? "text-green-700" : "text-foreground group-hover:text-primary"}`}>
                              {truck.name}
                            </h3>
                            {truck.isLive && (
                              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                              </span>
                            )}
                          </div>
                          {truck.cuisine && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/8 text-primary text-xs font-medium">
                              {truck.cuisine}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-4 pb-3 flex items-center justify-between">
                        {isSelected && (
                          <span className="text-xs text-primary/60 font-medium">Highlighted on map</span>
                        )}
                        <Link
                          href={`/trucks/${truck.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          View details <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-foreground font-medium">Truck lineup coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">Check back closer to the event date.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl !== null && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < photoGallery.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <div className="px-16 py-10 max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt={`Event photo ${lightboxIndex + 1}`}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <p className="text-center text-white/50 text-xs mt-3">
              {lightboxIndex + 1} / {photoGallery.length}
            </p>
          </div>

          {/* Thumbnail strip at bottom */}
          {photoGallery.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-lg px-4">
              {photoGallery.map((url, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === lightboxIndex ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
