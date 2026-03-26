import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { TruckCard } from "@/components/TruckCard";
import { MapView } from "@/components/MapView";
import { Search, Map as MapIcon, List, Filter, SlidersHorizontal } from "lucide-react";
import { useListTrucks } from "@workspace/api-client-react";

export default function Trucks() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  
  // Filters state
  const [city, setCity] = useState(searchParams.get('city') || "");
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || "");
  const [openNow, setOpenNow] = useState(searchParams.get('openNow') === 'true');
  const [search, setSearch] = useState(searchParams.get('search') || "");
  
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced or direct fetch. Orval hook reacts to param changes.
  const { data: trucks, isLoading } = useListTrucks({
    city: city || undefined,
    cuisine: cuisine || undefined,
    openNow: openNow || undefined,
    search: search || undefined
  });

  const uniqueCities = useMemo(() => {
    // In a real app, this would be an API call or aggregated. We mock a few static ones + whatever is in data
    const set = new Set(['Oklahoma City', 'Edmond', 'Norman', 'Moore']);
    trucks?.forEach(t => t.currentCity && set.add(t.currentCity));
    return Array.from(set).sort();
  }, [trucks]);

  const uniqueCuisines = useMemo(() => {
    const set = new Set(['Mexican', 'BBQ', 'Burgers', 'Dessert', 'Asian', 'Coffee']);
    trucks?.forEach(t => set.add(t.cuisine));
    return Array.from(set).sort();
  }, [trucks]);

  return (
    <Layout>
      <div className="bg-card border-b border-border/50 pt-8 pb-4 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h1 className="text-3xl font-display font-bold text-foreground">Browse Trucks</h1>
            
            <div className="flex items-center gap-2">
              <div className="bg-muted p-1 rounded-xl flex">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${viewMode === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4 mr-2" /> List
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${viewMode === 'map' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <MapIcon className="w-4 h-4 mr-2" /> Map
                </button>
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden p-2.5 bg-card border border-border rounded-xl text-foreground"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block mt-4`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <select 
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">All Cuisines</option>
                {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="mt-4 flex items-center">
              <label className="flex items-center cursor-pointer select-none">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={openNow}
                    onChange={(e) => setOpenNow(e.target.checked)}
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${openNow ? 'bg-primary' : 'bg-muted border border-border'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${openNow ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <span className="ml-3 font-medium text-sm text-foreground">Show only open now</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : trucks && trucks.length > 0 ? (
          viewMode === 'list' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trucks.map(truck => (
                <TruckCard key={truck.id} truck={truck} />
              ))}
            </div>
          ) : (
            <MapView trucks={trucks} height="70vh" />
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
