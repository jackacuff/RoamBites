import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Phone, Globe, Wifi, Zap, Droplets, Users, ArrowLeft, Truck, ChevronRight } from "lucide-react";
import { getApiUrl } from "@/lib/api";

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
  vacancies: any[];
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

export default function ParkDetail() {
  const params = useParams<{ id: string }>();
  const [park, setPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  return (
    <Layout>
      {/* Hero */}
      <div className="relative">
        {park.imageUrl ? (
          <img src={park.imageUrl} alt={park.name} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-primary/15 via-background to-secondary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-1">
          <Link href="/parks" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Truck Parks
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">{park.name}</h1>
          <p className="text-white/75 flex items-center gap-1.5 text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            {park.address}, {park.city}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">

          {/* Main content */}
          <div className="space-y-6">

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

            {/* Trucks Here Now */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Trucks Here Now</h2>
              {liveTrucks.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-7 h-7 text-muted-foreground opacity-40" />
                  </div>
                  <h3 className="font-semibold text-foreground">No trucks right now</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Trucks update their status in real time. Check back later or follow your favorites to get notified.
                  </p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Live count */}
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${liveTrucks.length > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                {liveTrucks.length}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {liveTrucks.length === 1 ? "Truck serving now" : "Trucks serving now"}
              </p>
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
