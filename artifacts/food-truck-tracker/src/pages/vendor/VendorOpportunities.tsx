import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Search, MapPin, Calendar, DollarSign, Users, Clock, CheckCircle,
  X, Repeat, Zap, ChevronRight, ListOrdered, Inbox, SlidersHorizontal,
  CalendarCheck, Filter, Briefcase, Building2, Star, TrendingUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type OpportunityKind = "event" | "spot";

type OpportunityType =
  | "event"
  | "truck_park"
  | "single_spot"
  | "recurring_host"
  | "popup_opportunity";

interface Opportunity {
  _key: string;
  kind: OpportunityKind;
  type: OpportunityType;
  typeLabel: string;
  title: string;
  subtitle?: string;
  location: string;
  city: string;
  date?: string;
  priceInCents: number;
  spotsAvailable: number;
  spotsTotal: number;
  isRecurring: boolean;
  tags: string[];
  href: string;
  raw: any;
}

interface MyApplication {
  _key: string;
  kind: OpportunityKind;
  title: string;
  location: string;
  date?: string;
  status: string;
  statusLabel: string;
  priceInCents?: number;
  createdAt: string;
  confirmedAt?: string;
  href: string;
  notes?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  event:            { label: "Event",         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  truck_park:       { label: "Truck Park",    color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  single_spot:      { label: "Single Spot",   color: "text-primary",     bg: "bg-orange-50 border-orange-200" },
  recurring_host:   { label: "Recurring Host", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  popup_opportunity:{ label: "Pop-Up",        color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
};

const APP_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:              { label: "Pending",        color: "bg-amber-50 text-amber-700 border-amber-200",   icon: <Clock className="w-3.5 h-3.5" /> },
  pending_host_approval:{ label: "Pending Review", color: "bg-amber-50 text-amber-700 border-amber-200",   icon: <Clock className="w-3.5 h-3.5" /> },
  approved:             { label: "Approved",       color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  confirmed:            { label: "Confirmed",      color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:             { label: "Not Selected",   color: "bg-gray-100 text-gray-500 border-gray-200",     icon: <X className="w-3.5 h-3.5" /> },
  declined:             { label: "Declined",       color: "bg-red-50 text-red-700 border-red-200",         icon: <X className="w-3.5 h-3.5" /> },
  waitlisted:           { label: "Waitlisted",     color: "bg-blue-50 text-blue-700 border-blue-200",      icon: <ListOrdered className="w-3.5 h-3.5" /> },
  cancelled:            { label: "Cancelled",      color: "bg-gray-100 text-gray-500 border-gray-200",     icon: <X className="w-3.5 h-3.5" /> },
};

const SORT_OPTIONS = [
  { id: "soonest",     label: "Soonest first" },
  { id: "newest",      label: "Newest listings" },
  { id: "price_asc",   label: "Lowest fee" },
  { id: "spots",       label: "Most spots open" },
];

const TYPE_FILTERS: { id: OpportunityType | "all"; label: string }[] = [
  { id: "all",              label: "All" },
  { id: "event",            label: "Events" },
  { id: "truck_park",       label: "Truck Parks" },
  { id: "single_spot",      label: "Single Spots" },
  { id: "recurring_host",   label: "Recurring Host" },
  { id: "popup_opportunity",label: "Pop-Ups" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getUrgencySignals(opp: Opportunity): string[] {
  const signals: string[] = [];
  if (opp.priceInCents === 0) signals.push("Free");
  if (opp.spotsAvailable <= 2 && opp.spotsAvailable > 0) signals.push(`${opp.spotsAvailable} spot${opp.spotsAvailable !== 1 ? "s" : ""} left`);
  if (opp.isRecurring) signals.push("Recurring");
  if (opp.kind === "event" && opp.date) {
    const days = Math.ceil((new Date(opp.date).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 7) signals.push("This week");
  }
  return signals;
}

function normalizeEvent(event: any): Opportunity | null {
  const allSlots = Array.isArray(event.spots)
    ? event.spots.reduce((s: number, sp: any) => s + (sp.availableSlots ?? 0), 0)
    : 0;
  const totalSlots = Array.isArray(event.spots)
    ? event.spots.reduce((s: number, sp: any) => s + (sp.totalSlots ?? 0), 0)
    : 0;
  const minPrice = Array.isArray(event.spots) && event.spots.length > 0
    ? Math.min(...event.spots.map((sp: any) => sp.priceInCents ?? 0))
    : 0;

  return {
    _key: `event-${event.id}`,
    kind: "event",
    type: "event",
    typeLabel: "Event",
    title: event.name,
    subtitle: event.description ?? undefined,
    location: event.venueName ?? event.city,
    city: event.city ?? "Oklahoma",
    date: event.startDateTime ?? undefined,
    priceInCents: minPrice,
    spotsAvailable: allSlots,
    spotsTotal: totalSlots,
    isRecurring: false,
    tags: [],
    href: `/events/${event.id}`,
    raw: event,
  };
}

function normalizeSpot(spot: any): Opportunity {
  const typeMeta = TYPE_META[spot.spotType] ?? TYPE_META.single_spot;
  return {
    _key: `spot-${spot.id}`,
    kind: "spot",
    type: spot.spotType as OpportunityType,
    typeLabel: typeMeta.label,
    title: spot.title,
    subtitle: spot.description ?? undefined,
    location: spot.address ? `${spot.address}, ${spot.city}` : spot.city,
    city: spot.city ?? "Oklahoma",
    date: undefined,
    priceInCents: spot.priceInCents ?? 0,
    spotsAvailable: spot.spotsAvailable ?? 0,
    spotsTotal: spot.spotsTotal ?? 0,
    isRecurring: spot.scheduleType === "recurring",
    tags: spot.tags ?? [],
    href: `/spots/${spot.id}`,
    raw: spot,
  };
}

// ── Opportunity Card ──────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const typeMeta = TYPE_META[opp.type] ?? TYPE_META.single_spot;
  const urgency = getUrgencySignals(opp);
  const isFull = opp.spotsAvailable === 0 && opp.spotsTotal > 0;
  const ctaLabel = opp.kind === "event" ? "Apply to Event" : "Request Spot";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeMeta.bg} ${typeMeta.color}`}>
            {opp.typeLabel}
          </span>
          {opp.isRecurring && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
              <Repeat className="w-3 h-3" /> Recurring
            </span>
          )}
          {urgency.filter(u => u !== "Recurring").map(u => (
            <span key={u} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u === "Free" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : u.includes("left") ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {u}
            </span>
          ))}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-primary text-sm">{formatPrice(opp.priceInCents)}</p>
          {opp.priceInCents > 0 && <p className="text-xs text-muted-foreground">/spot</p>}
        </div>
      </div>

      <h3 className="font-bold text-foreground text-base leading-snug mb-1 group-hover:text-primary transition-colors">
        {opp.title}
      </h3>

      {opp.subtitle && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{opp.subtitle}</p>
      )}

      <div className="space-y-1 mb-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> {opp.location}
        </p>
        {opp.date && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDate(opp.date)}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {opp.spotsTotal > 0 ? (
          <span className={`text-xs font-medium flex items-center gap-1.5 ${isFull ? "text-red-600" : "text-emerald-600"}`}>
            <Users className="w-3.5 h-3.5" />
            {isFull ? "Full" : `${opp.spotsAvailable} of ${opp.spotsTotal} open`}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground" />
        )}
        <Link href={opp.href}>
          <button className={`text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${isFull ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
            {ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ── My Application Row ────────────────────────────────────────────────────────

function ApplicationRow({ app }: { app: MyApplication }) {
  const cfg = APP_STATUS[app.status] ?? APP_STATUS.pending;
  const typeMeta = app.kind === "event" ? TYPE_META.event : TYPE_META.single_spot;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${app.status === "confirmed" || app.status === "approved" ? "border-emerald-200" : app.status === "pending_host_approval" || app.status === "pending" ? "border-amber-200" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeMeta.bg} ${typeMeta.color}`}>
              {app.kind === "event" ? "Event" : "Spot"}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <h4 className="font-semibold text-foreground text-sm truncate">{app.title}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" /> {app.location}
          </p>
          {app.date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 shrink-0" /> {formatDate(app.date)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          {app.priceInCents !== undefined && app.priceInCents > 0 && (
            <p className="text-sm font-bold text-primary">{formatPrice(app.priceInCents)}/spot</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Applied {formatDateShort(app.createdAt)}</p>
        </div>
      </div>
      {(app.status === "confirmed" || app.status === "approved") && (
        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-1.5">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          {app.kind === "event" ? "You're in! Check messages for event details." : "Confirmed — check your inbox for host contact info."}
        </div>
      )}
      {app.notes && (
        <p className="text-xs text-muted-foreground mt-2 italic">Your note: "{app.notes}"</p>
      )}
      <div className="flex items-center justify-end mt-3">
        <Link href={app.href}>
          <button className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            View details <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorOpportunities() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"browse" | "my-applications">("browse");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OpportunityType | "all">("all");
  const [sortBy, setSortBy] = useState("soonest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const [spotRequests, setSpotRequests] = useState<any[]>([]);
  const [eventReservations, setEventReservations] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState<"all" | "pending" | "confirmed" | "declined">("all");

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/events")).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/spots?limit=60")).then(r => r.json()).catch(() => ({ listings: [] })),
    ]).then(([evts, spotsData]) => {
      setEvents(Array.isArray(evts) ? evts : []);
      setSpots(Array.isArray(spotsData.listings) ? spotsData.listings : []);
    }).finally(() => setLoadingFeed(false));
  }, []);

  useEffect(() => {
    if (tab !== "my-applications" || !isAuthenticated) return;
    setLoadingApps(true);
    Promise.all([
      fetch(getApiUrl("/api/vendor/spot-applications"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ]).then(([apps, reservations]) => {
      setSpotRequests(Array.isArray(apps) ? apps : []);
      setEventReservations(Array.isArray(reservations) ? reservations : []);
    }).finally(() => setLoadingApps(false));
  }, [tab, isAuthenticated]);

  const opportunities = useMemo((): Opportunity[] => {
    const evtOpps = events.map(normalizeEvent).filter(Boolean) as Opportunity[];
    const spotOpps = spots.map(normalizeSpot);
    let all = [...evtOpps, ...spotOpps];

    if (typeFilter !== "all") {
      all = all.filter(o => o.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      all = all.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.typeLabel.toLowerCase().includes(q)
      );
    }

    if (sortBy === "soonest") {
      all.sort((a, b) => {
        if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });
    } else if (sortBy === "newest") {
      all.reverse();
    } else if (sortBy === "price_asc") {
      all.sort((a, b) => a.priceInCents - b.priceInCents);
    } else if (sortBy === "spots") {
      all.sort((a, b) => b.spotsAvailable - a.spotsAvailable);
    }

    return all;
  }, [events, spots, typeFilter, search, sortBy]);

  const myApplications = useMemo((): MyApplication[] => {
    const spotApps: MyApplication[] = spotRequests.map(app => ({
      _key: `spot-req-${app.id}`,
      kind: "spot" as OpportunityKind,
      title: app.listing?.title ?? "Spot Listing",
      location: app.listing?.address ? `${app.listing.address}, ${app.listing.city}` : (app.listing?.city ?? "Oklahoma"),
      date: undefined,
      status: app.status,
      statusLabel: APP_STATUS[app.status]?.label ?? app.status,
      priceInCents: app.listing?.priceInCents,
      createdAt: app.createdAt,
      confirmedAt: app.confirmedAt,
      href: `/spots/${app.listingId}`,
      notes: app.notes,
    }));

    const eventApps: MyApplication[] = eventReservations.map(res => ({
      _key: `event-res-${res.id}`,
      kind: "event" as OpportunityKind,
      title: res.event?.name ?? "Event",
      location: res.event?.venueName ?? res.event?.city ?? "Oklahoma",
      date: res.event?.startDateTime,
      status: res.status,
      statusLabel: APP_STATUS[res.status]?.label ?? res.status,
      priceInCents: res.paymentAmountInCents,
      createdAt: res.createdAt,
      href: `/events/${res.eventId}`,
      notes: res.notes,
    }));

    let all = [...eventApps, ...spotApps].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (appFilter !== "all") {
      if (appFilter === "pending") all = all.filter(a => a.status === "pending" || a.status === "pending_host_approval" || a.status === "waitlisted");
      else if (appFilter === "confirmed") all = all.filter(a => a.status === "confirmed" || a.status === "approved");
      else if (appFilter === "declined") all = all.filter(a => a.status === "declined" || a.status === "rejected" || a.status === "cancelled");
    }

    return all;
  }, [spotRequests, eventReservations, appFilter]);

  const pendingCount = useMemo(() =>
    [...spotRequests, ...eventReservations].filter(a =>
      a.status === "pending" || a.status === "pending_host_approval" || a.status === "waitlisted"
    ).length,
    [spotRequests, eventReservations]
  );

  const totalApps = spotRequests.length + eventReservations.length;

  const currentSort = SORT_OPTIONS.find(s => s.id === sortBy) ?? SORT_OPTIONS[0];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground leading-tight">
            Find Your Next Spot
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Events, recurring locations, and pop-ups — all in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit mb-6">
          <button
            onClick={() => setTab("browse")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "browse" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Browse Opportunities
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated) { navigate("/login"); return; }
              setTab("my-applications");
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${tab === "my-applications" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            My Applications
            {totalApps > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingCount > 0 ? "bg-amber-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {totalApps}
              </span>
            )}
          </button>
        </div>

        {/* ── BROWSE TAB ──────────────────────────────────────────────────────── */}
        {tab === "browse" && (
          <>
            {/* Search + Sort row */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, venue, city…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {currentSort.label}
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-xl z-20 py-1 min-w-44">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${sortBy === opt.id ? "font-semibold text-primary" : "text-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Type filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id as any)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                    typeFilter === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results count */}
            {!loadingFeed && (
              <p className="text-sm text-muted-foreground mb-4">
                {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"}
                {typeFilter !== "all" && ` · ${TYPE_FILTERS.find(f => f.id === typeFilter)?.label}`}
                {search && ` · "${search}"`}
              </p>
            )}

            {/* Feed */}
            {loadingFeed ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No opportunities found</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Try a different filter or search term. More spots and events are added regularly.
                </p>
                {(typeFilter !== "all" || search) && (
                  <button
                    onClick={() => { setTypeFilter("all"); setSearch(""); }}
                    className="mt-4 px-5 py-2 text-sm text-primary font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {opportunities.map(opp => (
                  <OpportunityCard key={opp._key} opp={opp} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MY APPLICATIONS TAB ─────────────────────────────────────────────── */}
        {tab === "my-applications" && (
          <>
            {/* Summary stats */}
            {(spotRequests.length + eventReservations.length) > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-card border border-border rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-foreground">{totalApps}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total applications</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-700">{pendingCount}</p>
                  <p className="text-xs text-amber-600 mt-1">Awaiting decision</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {[...spotRequests, ...eventReservations].filter(a => a.status === "confirmed" || a.status === "approved").length}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Confirmed</p>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "declined", label: "Declined" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppFilter(f.id as any)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    appFilter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loadingApps ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-2xl animate-pulse" />)}
              </div>
            ) : myApplications.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {appFilter === "all" ? "No applications yet" : `No ${appFilter} applications`}
                </h3>
                <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
                  Browse opportunities and apply — they'll all show up here so you can track every one.
                </p>
                <button
                  onClick={() => setTab("browse")}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Browse Opportunities
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.map(app => (
                  <ApplicationRow key={app._key} app={app} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
