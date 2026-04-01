import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Wifi, Zap, Droplets, Users, Search, Map, List, ChevronRight } from "lucide-react";
import { getApiUrl } from "@/lib/api";

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
  liveTrucksCount: number;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-3 h-3" />,
  power: <Zap className="w-3 h-3" />,
  water: <Droplets className="w-3 h-3" />,
  restrooms: <Users className="w-3 h-3" />,
};

function AmenityChip({ label }: { label: string }) {
  const icon = AMENITY_ICONS[label.toLowerCase()];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium capitalize">
      {icon}
      {label}
    </span>
  );
}

function ParkCard({ park }: { park: Park }) {
  return (
    <Link href={`/parks/${park.id}`}>
      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer">
        {park.imageUrl ? (
          <img src={park.imageUrl} alt={park.name} className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-primary/30" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{park.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {park.city}
              </p>
            </div>
            <div className="shrink-0">
              {park.liveTrucksCount > 0 ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {park.liveTrucksCount} live now
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  No trucks now
                </span>
              )}
            </div>
          </div>
          {park.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{park.description}</p>
          )}
          {park.amenities && park.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {park.amenities.slice(0, 4).map((a) => (
                <AmenityChip key={a} label={a} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ParksMap({ parks, selectedId }: { parks: Park[]; selectedId: number | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = L.default.map(mapRef.current!, {
        center: [35.48, -97.53],
        zoom: 10,
        zoomControl: true,
      });
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      leafletMapRef.current = map;
      setMapReady(true);
    });
    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const withCoords = parks.filter((p) => p.latitude && p.longitude);
      if (withCoords.length === 0) return;

      const bounds: [number, number][] = [];
      withCoords.forEach((park) => {
        const isSelected = park.id === selectedId;
        const isLive = park.liveTrucksCount > 0;
        const color = isSelected ? "#16a34a" : isLive ? "#16a34a" : "#f97316";
        const size = isSelected ? 22 : 16;
        const icon = L.default.divIcon({
          className: "",
          html: `<div style="
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:${color};
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const marker = L.default.marker([park.latitude!, park.longitude!], { icon })
          .addTo(leafletMapRef.current!)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px">
              <strong style="font-size:13px">${park.name}</strong>
              <div style="color:#666;font-size:11px;margin-top:2px">${park.city}</div>
              ${park.liveTrucksCount > 0
                ? `<div style="color:#16a34a;font-size:11px;margin-top:4px;font-weight:600">🟢 ${park.liveTrucksCount} truck${park.liveTrucksCount !== 1 ? "s" : ""} here now</div>`
                : `<div style="color:#999;font-size:11px;margin-top:4px">No trucks right now</div>`
              }
              <a href="/parks/${park.id}" style="display:block;margin-top:8px;font-size:11px;color:#f97316;font-weight:600">View Park →</a>
            </div>
          `);
        if (isSelected) marker.openPopup();
        markersRef.current.push(marker);
        bounds.push([park.latitude!, park.longitude!]);
      });

      if (bounds.length > 0 && !selectedId) {
        leafletMapRef.current!.fitBounds(bounds, { padding: [40, 40] });
      } else if (selectedId) {
        const sel = parks.find((p) => p.id === selectedId);
        if (sel?.latitude && sel?.longitude) {
          leafletMapRef.current!.setView([sel.latitude, sel.longitude], 13);
        }
      }
    });
  }, [parks, selectedId, mapReady]);

  return <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden z-0" />;
}

export default function Parks() {
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/parks"))
      .then((r) => r.json())
      .then((data) => {
        setParks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cities = ["all", ...Array.from(new Set(parks.map((p) => p.city))).sort()];

  const filtered = parks.filter((p) => {
    const matchesCity = cityFilter === "all" || p.city === cityFilter;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-display font-bold text-foreground">Truck Parks</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Discover dedicated food truck destinations near you — with live updates when trucks are serving.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search parks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {cities.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All cities" : c}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <Map className="w-4 h-4" /> Map
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No parks found</h3>
            <p className="text-muted-foreground mt-1">
              {parks.length === 0
                ? "No truck parks have been listed yet."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : view === "list" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((park) => (
              <ParkCard key={park.id} park={park} />
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[340px_1fr] gap-4">
            {/* Sidebar list */}
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map((park) => (
                <button
                  key={park.id}
                  onClick={() => setSelectedId(park.id === selectedId ? null : park.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${selectedId === park.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{park.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{park.city}</p>
                    </div>
                    <div className="shrink-0">
                      {park.liveTrucksCount > 0 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {park.liveTrucksCount} live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                          No trucks now
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/parks/${park.id}`} onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-primary font-medium mt-2 inline-block hover:underline">View details →</span>
                  </Link>
                </button>
              ))}
            </div>
            {/* Map */}
            <div className="h-[70vh] rounded-2xl overflow-hidden border border-border">
              <ParksMap parks={filtered} selectedId={selectedId} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
