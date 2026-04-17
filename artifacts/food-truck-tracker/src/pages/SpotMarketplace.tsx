import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  MapPin, Search, Filter, Clock, Users, DollarSign, Repeat,
  Zap, ChevronRight, Star, Building2, Home, Store, Calendar,
  SlidersHorizontal, X, CheckCircle, List, LayoutGrid,
} from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { SpotCardMap } from "@/components/SpotCardMap";

const SPOT_TYPE_LABELS: Record<string, string> = {
  truck_park: "Truck Park",
  single_spot: "Single Spot",
  recurring_host: "Recurring Host",
  popup_opportunity: "Pop-Up",
};

const SPOT_TYPE_ICONS: Record<string, React.ReactNode> = {
  truck_park: <Building2 className="w-3.5 h-3.5" />,
  single_spot: <Home className="w-3.5 h-3.5" />,
  recurring_host: <Repeat className="w-3.5 h-3.5" />,
  popup_opportunity: <Zap className="w-3.5 h-3.5" />,
};

const SPOT_TYPE_COLORS: Record<string, string> = {
  truck_park: "bg-blue-50 text-blue-700 border-blue-200",
  single_spot: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recurring_host: "bg-purple-50 text-purple-700 border-purple-200",
  popup_opportunity: "bg-amber-50 text-amber-700 border-amber-200",
};

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/spot`;
}

function ScheduleBadge({ listing }: { listing: any }) {
  if (listing.scheduleType === "recurring") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700">
        <Repeat className="w-3 h-3" /> Recurring
      </span>
    );
  }
  if (listing.schedules?.[0]?.date) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        {listing.schedules[0].date}
      </span>
    );
  }
  return null;
}

function SpotCard({ listing, view }: { listing: any; view: "grid" | "list" }) {
  const typeColor = SPOT_TYPE_COLORS[listing.spotType] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const typeLabel = SPOT_TYPE_LABELS[listing.spotType] ?? listing.spotType;
  const typeIcon = SPOT_TYPE_ICONS[listing.spotType];
  const isFull = listing.spotsAvailable === 0;

  if (view === "list") {
    return (
      <Link href={`/spots/${listing.id}`}>
        <div className="group flex gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
          <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            {listing.latitude && listing.longitude ? (
              <SpotCardMap lat={listing.latitude} lng={listing.longitude} className="w-full h-full" />
            ) : listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <MapPin className="w-8 h-8 text-primary/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor} mb-1`}>
                  {typeIcon} {typeLabel}
                </span>
                <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{listing.title}</h3>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary text-sm">{formatPrice(listing.priceInCents)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {listing.address ? `${listing.address}, ${listing.city}` : listing.city}
              {listing.distanceKm != null && (
                <span className="ml-1 text-primary font-medium">· {listing.distanceKm < 1 ? `${Math.round(listing.distanceKm * 1000)}m` : `${listing.distanceKm.toFixed(1)}km`}</span>
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <ScheduleBadge listing={listing} />
              <span className={`text-xs font-medium ${isFull ? "text-red-600" : "text-emerald-600"}`}>
                {isFull ? "Full" : `${listing.spotsAvailable} of ${listing.spotsTotal} open`}
              </span>
              {listing.isInstantBook && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-medium"><Zap className="w-3 h-3" /> Instant</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center group-hover:text-primary transition-colors" />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/spots/${listing.id}`}>
      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
        <div className="h-36 bg-gradient-to-br from-primary/10 to-secondary/10 relative">
          {listing.latitude && listing.longitude ? (
            <SpotCardMap lat={listing.latitude} lng={listing.longitude} className="w-full h-full" />
          ) : listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-primary/20" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm ${typeColor}`}>
              {typeIcon} {typeLabel}
            </span>
          </div>
          {isFull && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Full</div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors flex-1">{listing.title}</h3>
            <span className="font-bold text-primary text-sm shrink-0">{formatPrice(listing.priceInCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{listing.address ? `${listing.address}, ${listing.city}` : listing.city}</span>
          </p>
          {listing.distanceKm != null && (
            <p className="text-xs text-primary font-medium mb-2">{listing.distanceKm < 1 ? `${Math.round(listing.distanceKm * 1000)}m away` : `${listing.distanceKm.toFixed(1)}km away`}</p>
          )}
          <div className="flex-1" />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isFull ? "text-red-600" : "text-emerald-600"}`}>
                <Users className="w-3 h-3 inline mr-0.5" />
                {isFull ? "Full" : `${listing.spotsAvailable}/${listing.spotsTotal} open`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {listing.scheduleType === "recurring" && <Repeat className="w-3.5 h-3.5 text-purple-500" title="Recurring" />}
              {listing.isInstantBook && <Zap className="w-3.5 h-3.5 text-primary" title="Instant book" />}
              {listing.hasWaitlist && <Clock className="w-3.5 h-3.5 text-amber-500" title="Has waitlist" />}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "distance", label: "Closest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "spots", label: "Most spots open" },
];

export default function SpotMarketplace() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [spotType, setSpotType] = useState("");
  const [scheduleType, setScheduleType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isInstantBook, setIsInstantBook] = useState(false);
  const [hasWaitlist, setHasWaitlist] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setSortBy("distance"); },
      () => {}
    );
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (spotType) params.set("spotType", spotType);
      if (scheduleType) params.set("scheduleType", scheduleType);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (isInstantBook) params.set("isInstantBook", "true");
      if (hasWaitlist) params.set("hasWaitlist", "true");
      if (sortBy) params.set("sortBy", sortBy);
      if (userLat && userLng) { params.set("lat", String(userLat)); params.set("lng", String(userLng)); }
      params.set("limit", "48");

      const res = await fetch(getApiUrl(`/api/spots?${params.toString()}`));
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setListings(data.listings ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [search, spotType, scheduleType, maxPrice, isInstantBook, hasWaitlist, sortBy, userLat, userLng]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const activeFilterCount = [spotType, scheduleType, maxPrice, isInstantBook, hasWaitlist].filter(Boolean).length;

  function clearFilters() {
    setSpotType(""); setScheduleType(""); setMaxPrice(""); setIsInstantBook(false); setHasWaitlist(false);
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Spot Marketplace</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
                Find your next <span className="text-primary">spot</span>
              </h1>
              <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg">
                Truck parks, single lots, recurring venues, pop-ups — all in one place. Browse {total > 0 ? `${total} spots` : "spots"} near you.
              </p>
            </div>
            <Link href="/spots/new">
              <button className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg shadow-primary/20">
                + List a Spot
              </button>
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search spots, neighborhoods, hosts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-4 bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm">Filter spots</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Clear all</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Spot Type</label>
                  <select
                    value={spotType}
                    onChange={e => setSpotType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">All types</option>
                    {Object.entries(SPOT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Schedule</label>
                  <select
                    value={scheduleType}
                    onChange={e => setScheduleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Any</option>
                    <option value="one_time">One-time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Price ($/spot)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={isInstantBook} onChange={e => setIsInstantBook(e.target.checked)} className="rounded" />
                      <Zap className="w-3.5 h-3.5 text-primary" /> Instant book
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={hasWaitlist} onChange={e => setHasWaitlist(e.target.checked)} className="rounded" />
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Has waitlist
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Listing area */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total} spot${total !== 1 ? "s" : ""} found`}
          </p>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Spot type quick filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {[{ value: "", label: "All spots" }, ...Object.entries(SPOT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSpotType(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${spotType === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`${view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`bg-card border border-border rounded-2xl animate-pulse ${view === "grid" ? "h-64" : "h-24"}`} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No spots found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {activeFilterCount > 0 ? "Try adjusting your filters." : "Be the first to list a spot in your area!"}
            </p>
            {activeFilterCount > 0 ? (
              <button onClick={clearFilters} className="text-primary font-medium text-sm hover:underline">Clear filters</button>
            ) : (
              <Link href="/spots/new">
                <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  List a Spot
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {listings.map(l => <SpotCard key={l.id} listing={l} view={view} />)}
          </div>
        )}

        {/* CTA for non-hosts */}
        {!loading && listings.length > 0 && (
          <div className="mt-12 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-1">Have a spot for food trucks?</h3>
              <p className="text-muted-foreground text-sm">List your truck park, business parking, or property and connect with food trucks looking for a home.</p>
            </div>
            <Link href="/spots/new">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg shadow-primary/20">
                List a Spot →
              </button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
