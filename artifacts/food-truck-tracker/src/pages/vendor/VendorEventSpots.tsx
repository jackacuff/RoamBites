import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarCheck, MapPin, DollarSign, Loader2, ArrowLeft, CheckCircle, Clock, XCircle, Ticket, Map, List, Wifi, Zap, Droplets, Users, Phone, Globe, ChevronRight, Layers } from "lucide-react";
import { Link } from "wouter";

// ── Types ─────────────────────────────────────────────────────────────────

interface EventSpot {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  totalSlots: number;
  availableSlots: number;
  priceInCents: number;
  platformFeeInCents: number;
  requirements: string | null;
  vendorRules: string | null;
  isInstantBook: boolean;
  event?: { id: number; name: string; venueName: string; city: string; startDateTime: string };
}

interface MyReservation {
  id: number;
  spotId: number;
  eventId: number;
  status: string;
  paymentStatus: string;
  paymentAmountInCents: number;
  notes: string | null;
  organizerMessage: string | null;
  createdAt: string;
  spot: { id: number; name: string } | null;
  event: { id: number; name: string; venueName: string; city: string; startDateTime: string } | null;
}

interface Park {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  imageUrl: string | null;
  amenities: string[];
  maxTrucks: number | null;
  openSpots: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { color: "bg-muted text-muted-foreground", icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { color: "bg-destructive/10 text-destructive", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-3 h-3" />,
  power: <Zap className="w-3 h-3" />,
  water: <Droplets className="w-3 h-3" />,
  restrooms: <Users className="w-3 h-3" />,
};

// ── Truck Parks Map ───────────────────────────────────────────────────────

function TruckParksMap({ parks, selectedId, onSelect }: {
  parks: Park[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = L.default.map(mapRef.current!, { center: [35.48, -97.53], zoom: 10 });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      leafletMapRef.current = map;
    });
    return () => { leafletMapRef.current?.remove(); leafletMapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const withCoords = parks.filter((p) => p.latitude && p.longitude);
      if (!withCoords.length) return;

      const bounds: [number, number][] = [];
      withCoords.forEach((park) => {
        const isSelected = park.id === selectedId;
        const hasSpots = park.openSpots > 0;
        const color = isSelected ? "#7c3aed" : hasSpots ? "#16a34a" : "#9ca3af";
        const size = isSelected ? 22 : 16;
        const icon = L.default.divIcon({
          className: "",
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};border:2.5px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            ${isSelected ? "outline:3px solid #7c3aed40;" : ""}
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.default.marker([park.latitude!, park.longitude!], { icon })
          .addTo(leafletMapRef.current!)
          .on("click", () => onSelect(park.id === selectedId ? null : park.id))
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <strong style="font-size:13px;display:block;margin-bottom:3px">${park.name}</strong>
              <div style="color:#666;font-size:11px">${park.address}, ${park.city}</div>
              ${hasSpots
                ? `<div style="color:#16a34a;font-size:12px;font-weight:600;margin-top:5px">${park.openSpots} spot${park.openSpots !== 1 ? "s" : ""} open</div>`
                : `<div style="color:#9ca3af;font-size:11px;margin-top:5px">No openings right now</div>`}
              <a href="/parks/${park.id}" style="display:inline-block;margin-top:8px;font-size:11px;color:#f97316;font-weight:600">Full details →</a>
            </div>
          `);

        if (isSelected) marker.openPopup();
        markersRef.current.push(marker);
        bounds.push([park.latitude!, park.longitude!]);
      });

      if (!selectedId && bounds.length) {
        leafletMapRef.current!.fitBounds(bounds, { padding: [40, 40] });
      } else if (selectedId) {
        const sel = parks.find((p) => p.id === selectedId);
        if (sel?.latitude && sel?.longitude) leafletMapRef.current!.setView([sel.latitude, sel.longitude], 14);
      }
    });
  }, [parks, selectedId]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden z-0" />;
}

// ── Truck Parks Tab ───────────────────────────────────────────────────────

function TruckParksTab() {
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapView, setMapView] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/parks"))
      .then((r) => r.json())
      .then((d) => { setParks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectedPark = parks.find((p) => p.id === selectedId) ?? null;

  if (loading) return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[560px]">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>
      <div className="rounded-2xl bg-muted animate-pulse" />
    </div>
  );

  if (parks.length === 0) return (
    <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-16 text-center">
      <MapPin className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-3" />
      <p className="font-semibold text-foreground">No truck parks listed yet</p>
      <p className="text-sm text-muted-foreground mt-1">Parks will appear here when hosts register their lots.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Legend + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" />Spots available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />Full / no listings</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-600 inline-block" />Selected</span>
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setMapView(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mapView ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <Map className="w-3.5 h-3.5" /> Map
          </button>
          <button
            onClick={() => setMapView(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${!mapView ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>

      {mapView ? (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          {/* Sidebar */}
          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
            {parks.map((park) => (
              <button
                key={park.id}
                onClick={() => setSelectedId(park.id === selectedId ? null : park.id)}
                className={`text-left p-4 rounded-2xl border transition-all ${selectedId === park.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border bg-card hover:border-primary/30"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-foreground leading-tight">{park.name}</p>
                  {park.openSpots > 0 ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{park.openSpots} open</span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Full</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{park.city}</p>
                {park.amenities && park.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {park.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] capitalize">
                        {AMENITY_ICONS[a.toLowerCase()]}
                        {a}
                      </span>
                    ))}
                    {park.amenities.length > 3 && <span className="text-[10px] text-muted-foreground">+{park.amenities.length - 3}</span>}
                  </div>
                )}
                <Link href={`/parks/${park.id}`} onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-0.5 hover:underline">
                    View details <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </button>
            ))}
          </div>

          {/* Map */}
          <div className="h-[520px] rounded-2xl overflow-hidden border border-border shadow-sm">
            <TruckParksMap parks={parks} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>
      ) : (
        /* List view */
        <div className="grid sm:grid-cols-2 gap-4">
          {parks.map((park) => (
            <Link key={park.id} href={`/parks/${park.id}`}>
              <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full">
                {park.imageUrl ? (
                  <img src={park.imageUrl} alt={park.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{park.name}</h3>
                    {park.openSpots > 0 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{park.openSpots} open</span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Full</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{park.city}</p>
                  {park.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{park.description}</p>}
                  {park.amenities && park.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {park.amenities.slice(0, 4).map((a) => (
                        <span key={a} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] capitalize">
                          {AMENITY_ICONS[a.toLowerCase()]}
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type Tab = "event-spots" | "truck-parks" | "my-applications";

export default function SpotMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("event-spots");

  // Event spots state
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [spots, setSpots] = useState<EventSpot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [myReservations, setMyReservations] = useState<MyReservation[]>([]);

  useEffect(() => {
    fetch(getApiUrl("/api/events"), { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEvents(d.filter((e) => new Date(e.endDateTime) > new Date())); })
      .catch(() => {});
    loadMyReservations();
  }, [user]);

  const loadMyReservations = () => {
    fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setMyReservations(d); })
      .catch(() => {});
  };

  const loadSpots = async (eventId: number) => {
    setSpotsLoading(true);
    const res = await fetch(getApiUrl(`/api/events/${eventId}/spots`), { headers: authHeaders() });
    const data = await res.json();
    const event = events.find((e) => e.id === eventId);
    setSpots((Array.isArray(data) ? data : []).filter((s: any) => s.isActive).map((s: any) => ({ ...s, event })));
    setSpotsLoading(false);
  };

  const handleSelectEvent = (event: any) => { setSelectedEvent(event); loadSpots(event.id); };

  const handleApply = async (spot: EventSpot) => {
    setApplying(spot.id);
    try {
      const res = await fetch(getApiUrl(`/api/events/${spot.eventId}/spots/${spot.id}/apply`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      toast({ title: spot.isInstantBook ? "Booked instantly!" : "Application submitted!", description: spot.isInstantBook ? "Your spot is confirmed." : "The organizer will review your request." });
      loadSpots(spot.eventId);
      loadMyReservations();
      setTab("my-applications");
    } catch {
      toast({ title: "Error applying", variant: "destructive" });
    } finally { setApplying(null); }
  };

  const appliedSpotIds = new Set(
    myReservations.filter((r) => r.status !== "rejected" && r.status !== "cancelled").map((r) => r.spotId)
  );
  const pendingCount = myReservations.filter((r) => r.status === "pending").length;

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: "event-spots", label: "Event Spots" },
    { id: "truck-parks", label: "Truck Parks" },
    { id: "my-applications", label: "My Applications", badge: myReservations.length > 0 ? `${myReservations.length}` : undefined },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/vendor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Spot Marketplace</h1>
              <p className="text-muted-foreground text-sm">Find event vendor spots and recurring truck park locations.</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 border-b border-border pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? "text-primary border-b-2 border-primary -mb-px bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Event Spots ──────────────────────────────────────────────── */}
        {tab === "event-spots" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Events</h2>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No upcoming events found.</p>
                ) : events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedEvent?.id === event.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
                  >
                    <p className="font-medium text-foreground text-sm">{event.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.city} · {format(new Date(event.startDateTime), "MMM d")}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              {!selectedEvent ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                  <p className="text-foreground font-medium">Select an event to see available spots</p>
                </div>
              ) : spotsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : spots.length === 0 ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <p className="text-foreground font-medium mb-1">No spots available</p>
                  <p className="text-sm text-muted-foreground">This event hasn't opened vendor spots yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">{selectedEvent.name} — Available Spots</h2>
                  {spots.map((spot) => {
                    const alreadyApplied = appliedSpotIds.has(spot.id);
                    const isFull = spot.availableSlots <= 0;
                    const total = (spot.priceInCents + spot.platformFeeInCents) / 100;
                    return (
                      <div key={spot.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{spot.name}</h3>
                            {spot.description && <p className="text-sm text-muted-foreground mt-0.5">{spot.description}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-foreground">${total.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{spot.availableSlots}/{spot.totalSlots} open</p>
                          </div>
                        </div>
                        {spot.requirements && (
                          <div className="bg-muted/50 rounded-xl p-3 mb-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Requirements</p>
                            <p className="text-sm text-foreground">{spot.requirements}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {spot.isInstantBook ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Instant Book</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Approval Required</span>
                          )}
                          <div className="ml-auto">
                            {alreadyApplied ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">Applied</span>
                            ) : isFull ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">Full</span>
                            ) : (
                              <button
                                onClick={() => handleApply(spot)}
                                disabled={applying === spot.id}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {applying === spot.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                {spot.isInstantBook ? "Book Now" : "Apply"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Truck Parks ──────────────────────────────────────────────── */}
        {tab === "truck-parks" && <TruckParksTab />}

        {/* ── My Applications ───────────────────────────────────────────── */}
        {tab === "my-applications" && (
          <div>
            {myReservations.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                <Ticket className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-foreground font-medium mb-1">No applications yet</p>
                <p className="text-sm text-muted-foreground">Browse events and apply for vendor spots.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReservations.map((r) => {
                  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                  return (
                    <div key={r.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{r.event?.name || "Unknown Event"}</p>
                          <p className="text-sm text-muted-foreground">{r.spot?.name || "Spot"}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                          {style.icon}
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                      {r.event && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.event.city}</span>
                          <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />{format(new Date(r.event.startDateTime), "MMM d, yyyy")}</span>
                          {r.paymentAmountInCents > 0 && (
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(r.paymentAmountInCents / 100).toFixed(2)} — {r.paymentStatus}</span>
                          )}
                        </div>
                      )}
                      {r.organizerMessage && (
                        <div className="bg-muted/50 rounded-xl p-3 mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Organizer message</p>
                          <p className="text-sm text-foreground">{r.organizerMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
