import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { TruckCard } from "@/components/TruckCard";
import { MapView, haversineKm } from "@/components/MapView";
import { Search, Map as MapIcon, List, Filter, SlidersHorizontal, Navigation } from "lucide-react";
import { useListTrucks } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl, authHeaders } from "@/lib/api";

export default function Trucks() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const { isAuthenticated } = useAuth();
  
  // Filters state
  const [city, setCity] = useState(searchParams.get('city') || "");
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || "");
  const [openNow, setOpenNow] = useState(searchParams.get('openNow') === 'true');
  const [search, setSearch] = useState(searchParams.get('search') || "");
  
  const [viewMode, setViewMode] = useState<'list' | 'map'>(() =>
    new URLSearchParams(window.location.search).get('view') === 'map' ? 'map' : 'list'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteTruckIds, setFavoriteTruckIds] = useState<Set<number>>(new Set());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setFavoriteTruckIds(new Set()); return; }
    fetch(getApiUrl("/api/favorites"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFavoriteTruckIds(new Set(data.map((f: any) => f.truckId as number)));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { timeout: 6000, maximumAge: 120000 }
    );
  }, []);

  const { data: trucks, isLoading } = useListTrucks({
    city: city || undefined,
    cuisine: cuisine || undefined,
    openNow: openNow || undefined,
    search: search || undefined
  });

  const uniqueCities = useMemo(() => {
    const set = new Set(['Oklahoma City', 'Edmond', 'Norman', 'Moore']);
    trucks?.forEach(t => t.currentCity && set.add(t.currentCity));
    return Array.from(set).sort();
  }, [trucks]);

  const uniqueCuisines = useMemo(() => {
    const set = new Set(['Mexican', 'BBQ', 'Burgers', 'Dessert', 'Asian', 'Coffee']);
    trucks?.forEach(t => set.add(t.cuisine));
    return Array.from(set).sort();
  }, [trucks]);

  const trucksWithDistance = useMemo(() => {
    if (!trucks) return [];
    return trucks.map(t => {
      let distanceKm: number | undefined;
      if (userLocation && t.isLive && t.currentLatitude != null && t.currentLongitude != null) {
        distanceKm = haversineKm(userLocation.lat, userLocation.lng, t.currentLatitude, t.currentLongitude);
      }
      return { ...t, distanceKm };
    });
  }, [trucks, userLocation]);

  const activeFilterCount = [city, cuisine, openNow].filter(Boolean).length;

  return (
    <Layout>
      {/* z-[1200] ensures this header stays above Leaflet's internal z-indices (up to 1000) */}
      <div className="bg-card border-b border-border/50 pt-6 pb-4 sticky top-20 z-[1200]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: title + view toggle */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-display font-bold text-foreground">Browse Trucks</h1>
            <div className="flex items-center gap-2">
              {userLocation && (
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold border border-green-500/20">
                  <Navigation className="w-3 h-3" /> Distances shown
                </span>
              )}
              <div className="bg-muted p-1 rounded-xl flex">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-all ${viewMode === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4 mr-1.5" /> List
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-all ${viewMode === 'map' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <MapIcon className="w-4 h-4 mr-1.5" /> Map
                </button>
              </div>
            </div>
          </div>

          {/* Always-visible search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, cuisine, or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all whitespace-nowrap ${showFilters || activeFilterCount > 0 ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-foreground hover:border-primary/50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible filters: city, cuisine, open now */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-sm"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-sm"
              >
                <option value="">All Cuisines</option>
                {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-3 px-4 py-2.5 bg-background border border-border rounded-xl cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${openNow ? 'bg-primary' : 'bg-muted border border-border'}`} />
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${openNow ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm font-medium text-foreground">Open now only</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : trucksWithDistance.length > 0 ? (
          viewMode === 'list' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trucksWithDistance.map(truck => (
                <TruckCard key={truck.id} truck={truck} distanceKm={truck.distanceKm} />
              ))}
            </div>
          ) : (
            <MapView trucks={trucks!} favoriteTruckIds={favoriteTruckIds} height="70vh" userLocation={userLocation ?? undefined} />
          )
        ) : (
          <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-display font-bold text-foreground mb-2">No trucks found</h3>
            <p className="text-muted-foreground">Try adjusting your filters to find more options.</p>
            <button 
              onClick={() => { setCity(""); setCuisine(""); setOpenNow(false); setSearch(""); }}
              className="mt-6 px-6 py-2 bg-primary/10 text-primary font-semibold rounded-full hover:bg-primary/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
