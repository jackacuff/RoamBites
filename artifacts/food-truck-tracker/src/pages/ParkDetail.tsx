import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Phone, Globe, Wifi, Zap, Droplets, Users, ArrowLeft, Calendar, DollarSign, Truck, ChevronRight } from "lucide-react";
import { getApiUrl } from "@/lib/api";

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
}

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
  currentLatitude: number | null;
  currentLongitude: number | null;
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

function SmallMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let map: any;
    import("leaflet").then((L) => {
      map = L.default.map(mapRef.current!, { center: [lat, lng], zoom: 14, zoomControl: false });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      const icon = L.default.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.default.marker([lat, lng], { icon }).addTo(map).bindPopup(name).openPopup();
    });
    return () => { map?.remove(); };
  }, [lat, lng, name]);

  return <div ref={mapRef} className="w-full h-52 rounded-2xl overflow-hidden border border-border" />;
}

function formatRate(vacancy: Vacancy) {
  const parts: string[] = [];
  if (vacancy.dailyRate) parts.push(`$${vacancy.dailyRate}/day`);
  if (vacancy.weeklyRate) parts.push(`$${vacancy.weeklyRate}/week`);
  if (vacancy.monthlyRate) parts.push(`$${vacancy.monthlyRate}/month`);
  return parts.length > 0 ? parts.join(" · ") : "Rate negotiable";
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "Ongoing / flexible";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} – ${end}`;
}

export default function ParkDetail() {
  const params = useParams<{ id: string }>();
  const [park, setPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"trucks" | "spots">("trucks");

  useEffect(() => {
    fetch(getApiUrl(`/api/parks/${params.id}`))
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return; }
        const data = await r.json();
        setPark(data);
        setLoading(false);
        // Default to spots tab if no live trucks
        if (!data.liveTrucks || data.liveTrucks.length === 0) {
          setActiveTab("spots");
        }
      })
      .catch(() => setLoading(false));
  }, [params.id]);

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

  const totalOpenSpots = park.vacancies.reduce((sum, v) => sum + v.spotsAvailable, 0);
  const liveTrucks = park.liveTrucks ?? [];

  return (
    <Layout>
      {/* Hero image or gradient */}
      <div className="relative">
        {park.imageUrl ? (
          <img src={park.imageUrl} alt={park.name} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-primary/15 via-background to-secondary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <Link href="/parks" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Truck Parks
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white drop-shadow-sm">{park.name}</h1>
          <p className="text-white/80 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            {park.address}, {park.city}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Main content */}
          <div className="space-y-6">
            {/* Overview stats */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {liveTrucks.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {liveTrucks.length} truck{liveTrucks.length !== 1 ? "s" : ""} here now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                    No trucks checked in right now
                  </span>
                )}
                {totalOpenSpots > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    <Truck className="w-3.5 h-3.5" />
                    {totalOpenSpots} open spot{totalOpenSpots !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {park.description && (
                <p className="text-muted-foreground leading-relaxed">{park.description}</p>
              )}
              {park.amenities && park.amenities.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {park.amenities.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-sm capitalize"
                      >
                        {AMENITY_ICONS[a.toLowerCase()]}
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setActiveTab("trucks")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "trucks"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Trucks Here Now
                {liveTrucks.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === "trucks" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}>
                    {liveTrucks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("spots")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "spots"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Truck className="w-4 h-4" />
                Open Spots for Vendors
                {totalOpenSpots > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === "spots" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                    {totalOpenSpots}
                  </span>
                )}
              </button>
            </div>

            {/* Trucks Here Now tab */}
            {activeTab === "trucks" && (
              <div>
                {liveTrucks.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-7 h-7 text-muted-foreground opacity-40" />
                    </div>
                    <h3 className="font-semibold text-foreground">No trucks right now</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                      Check back soon — trucks update their status in real time when they're serving at this location.
                    </p>
                    {park.vacancies.length > 0 && (
                      <button
                        onClick={() => setActiveTab("spots")}
                        className="mt-4 text-sm text-primary font-semibold hover:underline"
                      >
                        View open spots for food trucks →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {liveTrucks.map((truck) => (
                      <Link key={truck.id} href={`/trucks/${truck.id}`}>
                        <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                          {truck.logoUrl || truck.imageUrl ? (
                            <img
                              src={truck.logoUrl || truck.imageUrl || ""}
                              alt={truck.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                              <span className="text-4xl font-bold text-primary/30">{truck.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{truck.name}</h3>
                              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live
                              </span>
                            </div>
                            {truck.cuisine && (
                              <p className="text-sm text-muted-foreground mt-0.5">{truck.cuisine}</p>
                            )}
                            {truck.tagline && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{truck.tagline}"</p>
                            )}
                            <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
                              <span className="text-xs text-primary font-semibold group-hover:underline flex items-center gap-1">
                                View menu <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Open Spots tab */}
            {activeTab === "spots" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Open Spots ({park.vacancies.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">For food truck vendors looking for a home base</p>
                </div>
                {park.vacancies.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center">
                    <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No vacancies listed at the moment.</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back soon or contact the park directly.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {park.vacancies.map((v) => (
                      <div key={v.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{v.title}</h3>
                            {v.description && (
                              <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {v.spotsAvailable} spot{v.spotsAvailable !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateRange(v.startDate, v.endDate)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatRate(v)}
                          </span>
                        </div>
                        {park.phone || park.website ? (
                          <div className="mt-3 pt-3 border-t border-border flex gap-3">
                            {park.phone && (
                              <a href={`tel:${park.phone}`} className="text-xs text-primary font-semibold hover:underline">
                                Call to inquire →
                              </a>
                            )}
                            {park.website && (
                              <a href={park.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold hover:underline">
                                Visit website →
                              </a>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${liveTrucks.length > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {liveTrucks.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Trucks live</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${totalOpenSpots > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {totalOpenSpots}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Open spots</p>
              </div>
              {park.maxTrucks && (
                <div className="col-span-2 bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{park.maxTrucks}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Max capacity</p>
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">{park.address}<br />{park.city}</span>
                </div>
                {park.phone && (
                  <a href={`tel:${park.phone}`} className="flex items-center gap-3 text-sm text-primary hover:underline">
                    <Phone className="w-4 h-4 shrink-0" />
                    {park.phone}
                  </a>
                )}
                {park.website && (
                  <a href={park.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary hover:underline">
                    <Globe className="w-4 h-4 shrink-0" />
                    Website
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
                  <MapPin className="w-4 h-4" />
                  Get Directions
                </a>
              )}
            </div>

            {/* Map */}
            {park.latitude && park.longitude && (
              <SmallMap lat={park.latitude} lng={park.longitude} name={park.name} />
            )}

            {/* Are you a vendor? CTA */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-1">Are you a food truck vendor?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {totalOpenSpots > 0
                  ? `This park has ${totalOpenSpots} open spot${totalOpenSpots !== 1 ? "s" : ""} available. Reach out to the park host to secure your space.`
                  : "Contact the park host to get on their waitlist for future openings."}
              </p>
              <button
                onClick={() => setActiveTab("spots")}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                View open spots
              </button>
            </div>

            {/* Host info */}
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
