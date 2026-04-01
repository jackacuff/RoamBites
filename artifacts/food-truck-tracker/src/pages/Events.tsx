import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListEvents } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import EventCard from "@/components/EventCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Calendar, Zap, MapPin, Users, ChevronRight, Share2, Check, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Events() {
  const [upcoming, setUpcoming] = useState(true);
  const { data: events, isLoading } = useListEvents({ upcoming: upcoming ? true : undefined });
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch(getApiUrl("/api/auth/upgrade-to-organizer"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upgrade failed");
      queryClient.invalidateQueries();
      toast({ title: "You're now an Event Organizer!", description: "Redirecting to your dashboard…" });
      setUpgradeModal(false);
      setTimeout(() => window.location.href = "/organizer", 1200);
    } catch (err: any) {
      toast({ title: "Upgrade failed", description: err.message, variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  }

  const isOrganizer = user?.role === "organizer";
  const canHost = !isAuthenticated || user?.role === "customer";
  const showHostCTA = !isOrganizer;

  const featuredEvents = events?.filter((e: any) => e.isFeatured) ?? [];
  const regularEvents  = events?.filter((e: any) => !e.isFeatured) ?? [];

  return (
    <Layout>
      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setUpgradeModal(false)}>
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Host an Event</h2>
              <p className="text-muted-foreground mt-2 text-sm">Upgrade your account to start organizing food truck events — it's free.</p>
            </div>
            <ul className="space-y-2.5 mb-7">
              {["Create events and fill spots with the right trucks", "Access the food truck marketplace", "Collect spot fees via Stripe Connect", "Manage invites, applications, and your lineup", "Event pages shared across RoamBites"].map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {pt}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {upgrading ? <><Loader2 className="w-4 h-4 animate-spin" /> Upgrading…</> : "Upgrade my account — it's free"}
            </button>
            <button onClick={() => setUpgradeModal(false)} className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/5 border-b border-border/50 pt-12 pb-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-3">
              <Calendar className="w-4 h-4" />
              <span>Central Oklahoma Food Truck Events</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-foreground mb-3 tracking-tight">
              Events & Festivals
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Community gatherings, food truck festivals, and street food markets across the region.
            </p>
          </div>
          {showHostCTA && (
            isOrganizer ? (
              <Link href="/organizer/events/new">
                <button className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:opacity-90 transition-opacity">
                  <Calendar className="w-4 h-4" /> Create Event
                </button>
              </Link>
            ) : isAuthenticated && user?.role === "customer" ? (
              <button
                onClick={() => setUpgradeModal(true)}
                className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" /> Host an Event
              </button>
            ) : !isAuthenticated ? (
              <Link href="/signup?role=organizer">
                <button className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:opacity-90 transition-opacity">
                  <Sparkles className="w-4 h-4" /> Host an Event
                </button>
              </Link>
            ) : null
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* Filter tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setUpcoming(true)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${upcoming ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setUpcoming(false)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!upcoming ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All Events
            </button>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {events ? `${events.length} event${events.length !== 1 ? "s" : ""}` : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner />
          </div>
        ) : events && events.length > 0 ? (
          <>
            {/* Featured Events spotlight */}
            {featuredEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="text-xl font-display font-bold text-foreground">Featured Events</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">Sponsored</span>
                </div>

                <div className="space-y-4">
                  {featuredEvents.map((event: any) => (
                    <FeaturedEventBanner key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* Regular Events grid */}
            {regularEvents.length > 0 && (
              <section>
                {featuredEvents.length > 0 && (
                  <h2 className="text-xl font-display font-bold text-foreground mb-5">All Events</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularEvents.map((event: any) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-24 rounded-3xl border border-dashed border-border bg-muted/20">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-semibold text-foreground mb-1">No events found</p>
            <p className="text-sm text-muted-foreground">Check back soon for upcoming food truck events in Central Oklahoma.</p>
          </div>
        )}

        {/* Feature your event CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-secondary/5 border border-primary/20 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-bold text-primary uppercase tracking-wider">Feature Your Event</span>
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-1">Get seen by thousands of food lovers</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Feature your event at the top of this page for 30 days. Reach the entire RoamBites audience across Central Oklahoma.
            </p>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-3xl font-black text-foreground mb-0.5">$29</p>
            <p className="text-sm text-muted-foreground mb-3">per 30 days</p>
            <Link href="/organizer/events" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Feature an event
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
}

function FeaturedEventBanner({ event }: { event: any }) {
  const start = new Date(event.startDateTime);
  const end   = new Date(event.endDateTime);
  const now   = new Date();
  const isOngoing = start <= now && end >= now;
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/events/${event.id}`;
    const shareData = { title: event.name, text: `Check out ${event.name} on RoamBites`, url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const GRADIENTS: Record<string, string> = {
    "Oklahoma City": "from-orange-500 to-amber-400",
    "Edmond":        "from-sky-500 to-cyan-400",
    "Norman":        "from-violet-500 to-purple-400",
    "Yukon":         "from-emerald-500 to-green-400",
    "Moore":         "from-rose-500 to-pink-400",
  };
  const gradient = GRADIENTS[event.city] ?? "from-primary to-secondary";

  return (
    <Link href={`/events/${event.id}`}>
      <div className="group relative rounded-3xl border border-primary/30 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
        <div className={`relative h-44 sm:h-52 bg-gradient-to-r ${gradient} rounded-t-3xl overflow-hidden`}>
          {event.bannerImageUrl && (
            <img src={event.bannerImageUrl} alt={event.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
            <Zap className="w-3 h-3 fill-current" />
            Featured Event
          </div>

          {isOngoing && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-bold shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Happening Now
            </div>
          )}

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white drop-shadow-md group-hover:text-white/90 transition-colors line-clamp-1">
                  {event.name}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  <span className="flex items-center gap-1.5 text-white/90 text-sm font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(start, "EEEE, MMMM d")} · {format(start, "h:mm a")}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/90 text-sm font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.venueName}, {event.city}
                  </span>
                  {event.confirmedTruckCount > 0 && (
                    <span className="flex items-center gap-1.5 text-white/90 text-sm font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {event.confirmedTruckCount} trucks confirmed
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 hidden sm:flex items-center gap-3">
                <button
                  onClick={handleShare}
                  title="Share event"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${shareCopied ? "bg-green-500 text-white" : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"}`}
                >
                  {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {shareCopied ? "Copied!" : "Share"}
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-foreground text-sm font-bold shadow group-hover:bg-primary group-hover:text-primary-foreground transition-colors whitespace-nowrap">
                  View details
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description strip if present */}
        {event.description && (
          <div className="px-5 sm:px-6 pt-3 pb-4 bg-card rounded-b-3xl text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </div>
        )}
      </div>
    </Link>
  );
}
