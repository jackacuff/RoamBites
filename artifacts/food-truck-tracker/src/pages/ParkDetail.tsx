import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Phone, Globe, Wifi, Zap, Droplets, Users, ArrowLeft, Truck, ChevronRight, Clock, CheckCircle, XCircle, ClipboardList, AlertCircle, X, DollarSign } from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface LiveTruck {
  id: number;
  name: string;
  slug: string;
  cuisine: string;
  description: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  isLive: boolean;
  tagline: string | null;
}

interface Vacancy {
  id: number;
  title: string;
  description: string | null;
  spotsAvailable: number;
  startDate: string | null;
  endDate: string | null;
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  isActive: boolean;
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
  host: { id: number; name: string } | null;
  vacancies: Vacancy[];
  liveTrucks: LiveTruck[];
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  power: <Zap className="w-4 h-4" />,
  water: <Droplets className="w-4 h-4" />,
  restrooms: <Users className="w-4 h-4" />,
};

const APP_STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending:  { color: "bg-amber-100 text-amber-700 border-amber-200",  icon: <Clock className="w-4 h-4" />,       label: "Application Pending" },
  approved: { color: "bg-green-100 text-green-700 border-green-200",  icon: <CheckCircle className="w-4 h-4" />, label: "Application Approved" },
  declined: { color: "bg-muted text-muted-foreground border-border",  icon: <XCircle className="w-4 h-4" />,     label: "Application Declined" },
  waiting:  { color: "bg-blue-100 text-blue-700 border-blue-200",     icon: <Clock className="w-4 h-4" />,       label: "On Waitlist" },
  contacted:{ color: "bg-violet-100 text-violet-700 border-violet-200",icon: <CheckCircle className="w-4 h-4" />,label: "Waitlist: Park Contacted You" },
};

function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const prev = sessionStorage.getItem("roambites_location_requested");
    if (prev === "denied") return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); sessionStorage.setItem("roambites_location_requested", "granted"); },
      () => { sessionStorage.setItem("roambites_location_requested", "denied"); },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);
  return location;
}

function SmallMap({ lat, lng, name, userLocation }: { lat: number; lng: number; name: string; userLocation: { lat: number; lng: number } | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let map: any;
    import("leaflet").then((L) => {
      map = L.default.map(mapRef.current!, { center: [lat, lng], zoom: 14, zoomControl: false });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
      const icon = L.default.divIcon({ className: "", html: `<div style="width:20px;height:20px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] });
      L.default.marker([lat, lng], { icon }).addTo(map).bindPopup(`<strong>${name}</strong>`).openPopup();
      mapInstanceRef.current = map;
      setMapReady(true);
    });
    return () => { map?.remove(); mapInstanceRef.current = null; setMapReady(false); };
  }, [lat, lng, name]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !userLocation) return;
    import("leaflet").then((L) => {
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
      const icon = L.default.divIcon({ className: "", html: `<div style="position:relative;width:16px;height:16px"><div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.3;animation:ping 1.5s ease-in-out infinite"></div><div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
      userMarkerRef.current = L.default.marker([userLocation.lat, userLocation.lng], { icon }).addTo(mapInstanceRef.current!).bindPopup("You are here");
    });
  }, [userLocation, mapReady]);

  return <div ref={mapRef} className="w-full h-52 rounded-2xl overflow-hidden border border-border" />;
}

// ── Apply / Waitlist Modal ─────────────────────────────────────────────────
function ActionModal({ mode, park, vacancies, onClose, onSuccess }: {
  mode: "apply" | "waitlist";
  park: Park;
  vacancies: Vacancy[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [selectedVacancyId, setSelectedVacancyId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = mode === "apply"
        ? getApiUrl(`/api/parks/${park.id}/apply`)
        : getApiUrl(`/api/parks/${park.id}/waitlist`);
      const body: any = { notes };
      if (mode === "apply" && selectedVacancyId) body.vacancyId = selectedVacancyId;

      const res = await fetch(url, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast({ title: mode === "apply" ? "Application submitted!" : "Added to waitlist!", description: mode === "apply" ? "The park host will review your application." : "You'll be notified if a spot opens up." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-lg">
              {mode === "apply" ? "Apply for a Spot" : "Join the Waitlist"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          {mode === "apply"
            ? `Applying to ${park.name}. The host will review your request and get back to you.`
            : `Adding your truck to the waitlist at ${park.name}. You'll be notified when a spot opens.`}
        </p>

        <div className="space-y-4">
          {mode === "apply" && vacancies.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Select vacancy (optional)</label>
              <select
                value={selectedVacancyId}
                onChange={e => setSelectedVacancyId(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Any available spot</option>
                {vacancies.map(v => (
                  <option key={v.id} value={v.id}>{v.title} ({v.spotsAvailable} spot{v.spotsAvailable !== 1 ? "s" : ""})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message to host (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tell the host about your truck, cuisine, schedule preferences..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {loading ? "Submitting…" : mode === "apply" ? "Submit Application" : "Join Waitlist"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParkDetail() {
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [park, setPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const userLocation = useUserLocation();

  const [myApplication, setMyApplication] = useState<any>(null);
  const [myWaitlist, setMyWaitlist] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"apply" | "waitlist" | null>(null);

  const isVendor = isAuthenticated && (user?.role === "vendor" || user?.role === "admin");

  useEffect(() => {
    fetch(getApiUrl(`/api/parks/${params.id}`))
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return; }
        const data = await r.json();
        setPark(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!isVendor || !params.id) return;
    setStatusLoading(true);
    fetch(getApiUrl("/api/vendor/park-applications"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.applications) {
          const parkId = parseInt(params.id);
          const app = data.applications.find((a: any) => a.parkId === parkId && ["pending","approved"].includes(a.status));
          setMyApplication(app ?? null);
          const wl = data.waitlist.find((w: any) => w.parkId === parkId && ["waiting","contacted"].includes(w.status));
          setMyWaitlist(wl ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [isVendor, params.id]);

  const handleActionSuccess = () => {
    setModalMode(null);
    if (!isVendor || !params.id) return;
    fetch(getApiUrl("/api/vendor/park-applications"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.applications) {
          const parkId = parseInt(params.id);
          const app = data.applications.find((a: any) => a.parkId === parkId && ["pending","approved"].includes(a.status));
          setMyApplication(app ?? null);
          const wl = data.waitlist.find((w: any) => w.parkId === parkId && ["waiting","contacted"].includes(w.status));
          setMyWaitlist(wl ?? null);
        }
      }).catch(() => {});
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
          <div className="h-64 rounded-3xl bg-muted animate-pulse" />
          <div className="h-8 w-64 rounded-xl bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded bg-muted animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (notFound || !park) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground">Park not found</h2>
          <Link href="/parks"><button className="mt-4 text-primary font-medium hover:underline">← Back to Truck Parks</button></Link>
        </div>
      </Layout>
    );
  }

  const liveTrucks = park.liveTrucks ?? [];
  const activeVacancies = park.vacancies?.filter(v => v.isActive) ?? [];
  const totalOpenSpots = activeVacancies.reduce((s, v) => s + v.spotsAvailable, 0);
  const hasOpenSpots = totalOpenSpots > 0;

  const vendorCTAStatus = myApplication
    ? APP_STATUS_STYLES[myApplication.status]
    : myWaitlist
      ? APP_STATUS_STYLES[myWaitlist.status] ?? APP_STATUS_STYLES.waiting
      : null;

  return (
    <Layout>
      <style>{`@keyframes ping { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.8);opacity:0.1} }`}</style>

      {modalMode && (
        <ActionModal
          mode={modalMode}
          park={park}
          vacancies={activeVacancies}
          onClose={() => setModalMode(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Hero */}
      <div className="relative">
        {park.imageUrl
          ? <img src={park.imageUrl} alt={park.name} className="w-full h-64 object-cover" />
          : <div className="w-full h-64 bg-gradient-to-br from-primary/15 via-background to-secondary/10" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-1">
          <Link href="/parks" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Truck Parks
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">{park.name}</h1>
          <p className="text-white/75 flex items-center gap-1.5 text-sm"><MapPin className="w-4 h-4 shrink-0" />{park.address}, {park.city}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">

          {/* Main content */}
          <div className="space-y-6">

            {/* Vendor CTA Banner */}
            {isVendor && !statusLoading && (
              <div>
                {vendorCTAStatus ? (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${vendorCTAStatus.color}`}>
                    {vendorCTAStatus.icon}
                    <div>
                      <p className="font-semibold text-sm">{vendorCTAStatus.label}</p>
                      {(myApplication?.hostMessage || myWaitlist?.hostMessage) && (
                        <p className="text-xs mt-0.5 opacity-80">{myApplication?.hostMessage ?? myWaitlist?.hostMessage}</p>
                      )}
                    </div>
                  </div>
                ) : hasOpenSpots ? (
                  <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{totalOpenSpots} spot{totalOpenSpots !== 1 ? "s" : ""} available at this park</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Apply now to reserve your space. The host will review your application.</p>
                    </div>
                    <button
                      onClick={() => setModalMode("apply")}
                      className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                    >
                      Apply for a Spot
                    </button>
                  </div>
                ) : (
                  <div className="bg-muted/50 border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">No spots open right now</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Join the waitlist and you'll be the first to know when something opens up.</p>
                    </div>
                    <button
                      onClick={() => setModalMode("waitlist")}
                      className="shrink-0 px-5 py-2.5 rounded-xl border border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
                    >
                      Join Waitlist
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Not logged in CTA */}
            {!isAuthenticated && (
              <div className="bg-muted/30 border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {hasOpenSpots ? "Spots are available! Sign in as a vendor to apply." : "Join the waitlist to be notified when spots open."}
                </p>
                <Link href="/login">
                  <button className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Sign In
                  </button>
                </Link>
              </div>
            )}

            {/* Live status + description */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-4">
                {liveTrucks.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {liveTrucks.length} truck{liveTrucks.length !== 1 ? "s" : ""} serving here now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    No trucks right now — check back soon
                  </span>
                )}
              </div>
              {park.description && <p className="text-muted-foreground leading-relaxed">{park.description}</p>}
              {park.amenities && park.amenities.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {park.amenities.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-sm capitalize">
                        {AMENITY_ICONS[a.toLowerCase()]}
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Open Spots / Vacancies */}
            {activeVacancies.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Open Spots
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({totalOpenSpots} available)</span>
                </h2>
                <div className="space-y-3">
                  {activeVacancies.map(v => (
                    <div key={v.id} className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{v.title}</h3>
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          {v.spotsAvailable} open
                        </span>
                      </div>
                      {v.description && <p className="text-sm text-muted-foreground mb-3">{v.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {v.startDate && <span>From {v.startDate}{v.endDate ? ` to ${v.endDate}` : ""}</span>}
                        {v.dailyRate && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${v.dailyRate}/day</span>}
                        {v.weeklyRate && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${v.weeklyRate}/week</span>}
                        {v.monthlyRate && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${v.monthlyRate}/month</span>}
                      </div>
                      {isVendor && !myApplication && !myWaitlist && (
                        <button
                          onClick={() => setModalMode("apply")}
                          className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Apply for This Spot
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trucks Here Now */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Trucks Here Now</h2>
              {liveTrucks.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-7 h-7 text-muted-foreground opacity-40" />
                  </div>
                  <h3 className="font-semibold text-foreground">No trucks right now</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Trucks update their status in real time. Check back later.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {liveTrucks.map((truck) => (
                    <Link key={truck.id} href={`/trucks/${truck.id}`}>
                      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                        {truck.logoUrl || truck.imageUrl ? (
                          <img src={truck.logoUrl || truck.imageUrl || ""} alt={truck.name} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                            <span className="text-4xl font-bold text-primary/30">{truck.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{truck.name}</h3>
                            <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                            </span>
                          </div>
                          {truck.cuisine && <p className="text-sm text-muted-foreground mt-0.5">{truck.cuisine}</p>}
                          {truck.tagline && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{truck.tagline}"</p>}
                          <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
                            <span className="text-xs text-primary font-semibold group-hover:underline flex items-center gap-1">View menu <ChevronRight className="w-3 h-3" /></span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Spot summary */}
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${hasOpenSpots ? "text-green-600" : "text-muted-foreground"}`}>
                {totalOpenSpots}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalOpenSpots === 1 ? "Open spot" : "Open spots"}
              </p>
              {isVendor && !myApplication && !myWaitlist && (
                <button
                  onClick={() => setModalMode(hasOpenSpots ? "apply" : "waitlist")}
                  className={`mt-3 w-full py-2 rounded-xl text-xs font-bold transition-colors ${hasOpenSpots ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-primary text-primary hover:bg-primary/5"}`}
                >
                  {hasOpenSpots ? "Apply for a Spot" : "Join Waitlist"}
                </button>
              )}
              {liveTrucks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className={`text-2xl font-bold text-green-600`}>{liveTrucks.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Trucks serving now</p>
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Visit</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">{park.address}<br />{park.city}</span>
                </div>
                {park.phone && (
                  <a href={`tel:${park.phone}`} className="flex items-center gap-3 text-sm text-primary hover:underline">
                    <Phone className="w-4 h-4 shrink-0" />{park.phone}
                  </a>
                )}
                {park.website && (
                  <a href={park.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary hover:underline">
                    <Globe className="w-4 h-4 shrink-0" />Website
                  </a>
                )}
              </div>
              {park.latitude && park.longitude && (
                <a
                  href={`https://maps.apple.com/?daddr=${park.latitude},${park.longitude}&dirflg=d`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  <MapPin className="w-4 h-4" />Get Directions
                </a>
              )}
            </div>

            {park.latitude && park.longitude && (
              <SmallMap lat={park.latitude} lng={park.longitude} name={park.name} userLocation={userLocation} />
            )}

            {park.host && (
              <div className="bg-muted/50 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
                Hosted by <span className="font-medium text-foreground">{park.host.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
