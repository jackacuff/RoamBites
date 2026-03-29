import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Phone, Globe, Wifi, Zap, Droplets, Users, ArrowLeft, Calendar, DollarSign, Truck } from "lucide-react";
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

  useEffect(() => {
    fetch(getApiUrl(`/api/parks/${params.id}`))
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return; }
        setPark(await r.json());
        setLoading(false);
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
          <div className="space-y-8">
            {/* Overview */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  {totalOpenSpots > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-bold mb-3">
                      <Truck className="w-4 h-4" />
                      {totalOpenSpots} spot{totalOpenSpots !== 1 ? "s" : ""} available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-3">
                      No openings right now
                    </span>
                  )}
                  {park.description && (
                    <p className="text-muted-foreground leading-relaxed">{park.description}</p>
                  )}
                </div>
                {park.maxTrucks && (
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-bold text-foreground">{park.maxTrucks}</p>
                    <p className="text-xs text-muted-foreground">max trucks</p>
                  </div>
                )}
              </div>

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

            {/* Vacancies */}
            <div>
              <h2 className="text-xl font-display font-bold text-foreground mb-4">
                Open Spots ({park.vacancies.length})
              </h2>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
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
