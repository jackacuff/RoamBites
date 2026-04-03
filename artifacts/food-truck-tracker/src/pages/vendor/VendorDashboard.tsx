import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Truck, BookOpen, Calendar, CalendarCheck, Wifi, WifiOff, Plus, ClipboardList,
  Mail, Phone, MapPin, Palette, Megaphone, Ticket, Share2, Copy, Check, Navigation,
  Loader2, MessageSquare, CreditCard, AlertTriangle, CheckCircle, Clock, ExternalLink,
  Sparkles, BarChart2, ChevronRight, Rocket,
} from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";

type VendorSubscription = {
  id: number; status: string; trialEndsAt: string | null; currentPeriodEnd: string | null;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null; canceledAt: string | null;
  planId: number; planName: string; monthlyPrice: number; trialDaysLeft: number | null; features: string[];
};

// ── Slim subscription notice ─────────────────────────────────────────────────
function SubscriptionNotice({ sub, onSubscribe, onPortal, isLoading }: {
  sub: VendorSubscription | null; onSubscribe: () => void; onPortal: () => void; isLoading: boolean;
}) {
  if (!sub) return null;

  if (sub.status === "trialing" && sub.trialDaysLeft !== null) {
    const isUrgent = sub.trialDaysLeft <= 14;
    return (
      <div className={`mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${isUrgent ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-amber-600" : "text-blue-600"}`} />
          <span className={`font-medium truncate ${isUrgent ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"}`}>
            {sub.trialDaysLeft === 0 ? "Trial ends today" : `${sub.trialDaysLeft} days left in trial`}
            <span className="font-normal opacity-75"> · {sub.planName} · ${sub.monthlyPrice.toFixed(2)}/mo after</span>
          </span>
        </div>
        <button onClick={onSubscribe} disabled={isLoading}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 ${isUrgent ? "bg-amber-600 text-white" : "bg-blue-600 text-white"}`}>
          <Rocket className="w-3.5 h-3.5" />
          {isLoading ? "…" : "Go Pro"}
        </button>
      </div>
    );
  }

  if (sub.status === "active") {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-green-800 dark:text-green-300 font-medium">{sub.planName} — Active</span>
          {sub.currentPeriodEnd && (
            <span className="text-green-700 dark:text-green-400 text-xs hidden sm:inline">· Renews {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}</span>
          )}
        </div>
        {sub.stripeSubscriptionId && (
          <button onClick={onPortal} disabled={isLoading}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-green-900/30 border border-green-300 text-green-800 dark:text-green-300 hover:bg-green-50 transition-colors disabled:opacity-50">
            <ExternalLink className="w-3.5 h-3.5" />
            {isLoading ? "…" : "Billing"}
          </button>
        )}
      </div>
    );
  }

  if (sub.status === "past_due" || sub.status === "canceled") {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-red-800 dark:text-red-300 font-medium">
            {sub.status === "past_due" ? "Payment required — listing may be hidden" : "Subscription canceled"}
          </span>
        </div>
        <button onClick={onSubscribe} disabled={isLoading}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
          {isLoading ? "…" : "Reactivate"}
        </button>
      </div>
    );
  }

  return null;
}

// ── Nav Card ─────────────────────────────────────────────────────────────────
function NavCard({ href, icon, title, description, badge }: {
  href: string; icon: React.ReactNode; title: string; description: string; badge?: string;
}) {
  return (
    <Link href={href}>
      <div className="bg-card border border-card-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex items-center gap-3.5 relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <h3 className="font-semibold text-foreground text-sm leading-snug">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        {badge && (
          <span className="absolute top-3 right-8 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{badge}</span>
        )}
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
      </div>
    </Link>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-0.5">{children}</p>
  );
}

// ── Lazy-loaded components ────────────────────────────────────────────────────
const CheckInMapModal = lazy(() =>
  import("@/components/CheckInMapModal").then((m) => ({ default: m.CheckInMapModal }))
);
const LiveMiniMap = lazy(() =>
  import("@/components/LiveMiniMap").then((m) => ({ default: m.LiveMiniMap }))
);

// ── Main component ────────────────────────────────────────────────────────────
export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [specials, setSpecials] = useState<any[]>([]);
  const [mySpotReservations, setMySpotReservations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [parks, setParks] = useState<{ id: number; name: string; city: string; openSpots: number }[]>([]);
  const [selectedParkId, setSelectedParkId] = useState("");
  const [parkCheckingIn, setParkCheckingIn] = useState(false);

  const { data: subscription } = useQuery<VendorSubscription | null>({
    queryKey: ["/api/vendor/subscription"],
    queryFn: () => fetch(getApiUrl("/api/vendor/subscription"), { headers: authHeaders() }).then(r => r.json()),
  });

  const handleSubscribe = async () => {
    setBillingLoading(true);
    try {
      const r = await fetch(getApiUrl("/api/vendor/subscription/subscribe"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ successUrl: window.location.href + "?subscribed=1", cancelUrl: window.location.href }),
      });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: data.error || "Could not start checkout", variant: "destructive" });
    } catch { toast({ title: "Something went wrong", variant: "destructive" }); }
    finally { setBillingLoading(false); }
  };

  const handlePortal = async () => {
    setBillingLoading(true);
    try {
      const r = await fetch(getApiUrl("/api/vendor/subscription/portal"), { method: "POST", headers: authHeaders() });
      const data = await r.json();
      if (data.url) window.open(data.url, "_blank");
      else toast({ title: data.error || "Could not open billing portal", variant: "destructive" });
    } catch { toast({ title: "Something went wrong", variant: "destructive" }); }
    finally { setBillingLoading(false); }
  };

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  useEffect(() => {
    fetch(getApiUrl("/api/vendor/reservations"), { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setReservations(d); }).catch(() => {})
      .finally(() => setResLoading(false));
    fetch(getApiUrl("/api/vendor/specials"), { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setSpecials(d.filter((s: any) => s.isActive)); }).catch(() => {});
    fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setMySpotReservations(d); }).catch(() => {});
    fetch(getApiUrl("/api/messages/unread-count"), { headers: authHeaders() })
      .then(r => r.json()).then(d => setUnreadCount(d.count || 0)).catch(() => {});
    fetch(getApiUrl("/api/parks"))
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setParks(d); }).catch(() => {});
  }, []);

  const checkInMutation = useCheckInTruck();
  const checkOutMutation = useCheckOutTruck();

  const handleCheckIn = async (lat?: number, lng?: number) => {
    if (!myTruck) return;
    try {
      await checkInMutation.mutateAsync({
        id: myTruck.id,
        data: lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : {},
      });
      toast({ title: "You're live! 🎉", description: lat !== undefined ? "Broadcasting your location." : "Customers can see you're open." });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); throw e; }
  };

  const handleCheckOut = async () => {
    if (!myTruck) return;
    try {
      await checkOutMutation.mutateAsync({ id: myTruck.id });
      toast({ title: "You're now offline." });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleParkCheckIn = async () => {
    if (!myTruck || !selectedParkId) return;
    setParkCheckingIn(true);
    try {
      const res = await fetch(getApiUrl(`/api/trucks/${myTruck.id}/park-checkin`), {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ parkId: parseInt(selectedParkId) }),
      });
      if (!res.ok) throw new Error("Check-in failed");
      const park = parks.find(p => p.id === parseInt(selectedParkId));
      toast({ title: `Checked in at ${park?.name ?? "the park"}!` });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch { toast({ title: "Check-in failed", variant: "destructive" }); }
    finally { setParkCheckingIn(false); }
  };

  const handleParkCheckOut = async () => {
    if (!myTruck) return;
    try {
      await fetch(getApiUrl(`/api/trucks/${myTruck.id}/park-checkout`), { method: "POST", headers: authHeaders() });
      toast({ title: "Checked out of park" });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch { toast({ title: "Error checking out", variant: "destructive" }); }
  };

  const shareUrl = myTruck ? `${window.location.origin}/trucks/${myTruck.slug}` : "";
  const shareCaption = myTruck?.currentLocation
    ? `We're out today at ${myTruck.currentLocation}! Come find us 🔥\n${shareUrl}`
    : `Find ${myTruck?.name} on RoamBites!\n${shareUrl}`;

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!" });
  };

  const nativeShare = async () => {
    if (navigator.share) await navigator.share({ title: myTruck?.name, text: shareCaption, url: shareUrl });
    else copyText(shareUrl, "url");
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const subStatus = subscription?.status;
  const canGoLive = subStatus === "active" ||
    (subStatus === "trialing" && (subscription?.trialDaysLeft ?? 0) >= 0);
  const pendingSpots = mySpotReservations.filter(r => r.status === "pending").length;
  const approvedSpots = mySpotReservations.filter(r => r.status === "approved").length;
  const currentParkId = (myTruck as any)?.currentParkId;
  const currentPark = currentParkId ? parks.find(p => p.id === currentParkId) : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-foreground">Vendor Dashboard</h1>
          {myTruck && <p className="text-sm text-muted-foreground mt-0.5">{myTruck.name}</p>}
        </div>

        {/* Slim subscription notice */}
        <SubscriptionNotice
          sub={subscription ?? null}
          onSubscribe={handleSubscribe}
          onPortal={handlePortal}
          isLoading={billingLoading}
        />

        {/* ── No truck yet ── */}
        {!myTruck ? (
          <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
            <Truck className="w-14 h-14 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Truck Profile Yet</h2>
            <p className="text-muted-foreground text-sm mb-5">Create your profile to start listing your truck and getting booked.</p>
            <Link href="/vendor/truck">
              <button className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 text-sm">
                <Plus className="w-4 h-4" />
                Create Truck Profile
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── SECTION 1: You're Live ───────────────────────────────────── */}
            <div className={`mb-3 p-5 rounded-2xl border ${myTruck.isLive ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-card border-card-border"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {myTruck.isLive ? (
                    <>
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Wifi className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full" />
                      </div>
                      <div>
                        <p className="font-bold text-green-800 dark:text-green-400 text-sm">You're Live!</p>
                        <p className="text-xs text-green-700 dark:text-green-500">
                          {(myTruck as any).currentLatitude
                            ? `${(myTruck as any).currentLatitude?.toFixed(4)}, ${(myTruck as any).currentLongitude?.toFixed(4)}`
                            : myTruck.currentLocation || "Broadcasting · no pin set"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <WifiOff className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">Offline</p>
                        <p className="text-xs text-muted-foreground">Go live so customers can find you</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {myTruck.isLive ? (
                    <>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚚 ${myTruck.name} is LIVE! Find us on RoamBites.`)}&url=${encodeURIComponent(`${window.location.origin}/trucks/${myTruck.id}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-xl text-xs font-semibold hover:bg-zinc-800"
                      >
                        <Share2 className="w-3.5 h-3.5" />Share
                      </a>
                      <button onClick={() => setCheckInModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-800 rounded-xl text-xs font-semibold hover:bg-green-50">
                        <MapPin className="w-3.5 h-3.5" />Update Location
                      </button>
                      <button onClick={handleCheckOut} disabled={checkOutMutation.isPending}
                        className="px-3 py-2 bg-white border border-green-300 text-green-800 rounded-xl text-xs font-semibold hover:bg-green-50 disabled:opacity-50">
                        {checkOutMutation.isPending ? "…" : "Go Offline"}
                      </button>
                    </>
                  ) : canGoLive ? (
                    <button onClick={() => setCheckInModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-sm text-sm">
                      <Wifi className="w-4 h-4" />Go Live
                    </button>
                  ) : (
                    <button onClick={handleSubscribe} disabled={billingLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      {billingLoading ? "…" : "Go Pro to Go Live"}
                    </button>
                  )}
                </div>
              </div>

              {/* Park status inline */}
              {currentPark && (
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-green-700 dark:text-green-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Checked in at <span className="font-semibold">{currentPark.name}</span>
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/parks/${currentPark.id}`}>
                      <button className="text-xs px-2.5 py-1 rounded-lg border border-green-300 text-green-800 hover:bg-green-100 transition-colors font-medium">View Park</button>
                    </Link>
                    <button onClick={handleParkCheckOut} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-green-300 text-green-800 hover:bg-green-50 font-medium">Leave</button>
                  </div>
                </div>
              )}

              {/* Park check-in picker (only when not checked into a park and parks available) */}
              {!currentPark && canGoLive && parks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <select value={selectedParkId} onChange={e => setSelectedParkId(e.target.value)}
                    className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Check in at a Truck Park…</option>
                    {parks.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.city}{p.openSpots > 0 ? ` (${p.openSpots} open)` : ""}</option>
                    ))}
                  </select>
                  <button onClick={handleParkCheckIn} disabled={!selectedParkId || parkCheckingIn}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:opacity-90">
                    {parkCheckingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    Check In
                  </button>
                </div>
              )}
            </div>

            {/* Live mini-map */}
            {myTruck.isLive && (myTruck as any).currentLatitude && (myTruck as any).currentLongitude && (
              <div className="mb-5">
                <Suspense fallback={<div className="h-40 rounded-2xl bg-muted animate-pulse" />}>
                  <LiveMiniMap lat={(myTruck as any).currentLatitude} lng={(myTruck as any).currentLongitude} truckName={myTruck.name} />
                </Suspense>
              </div>
            )}

            {/* Pending approval notice */}
            {!myTruck.isApproved && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Your truck is pending approval and won't appear publicly until reviewed.
              </div>
            )}

            {/* ── SECTION 2: Quick Actions ─────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {/* Update Location / Go Live */}
              <button onClick={() => canGoLive ? setCheckInModalOpen(true) : handleSubscribe()}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm ${myTruck.isLive ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100" : "bg-card border-card-border text-foreground hover:border-primary/40"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${myTruck.isLive ? "bg-green-100" : "bg-primary/10"}`}>
                  {myTruck.isLive ? <MapPin className="w-4.5 h-4.5 text-green-600" /> : <Wifi className="w-4.5 h-4.5 text-primary" />}
                </div>
                {myTruck.isLive ? "Update Location" : "Go Live"}
              </button>

              {/* Share Today */}
              <button onClick={() => setPromoteOpen(o => !o)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm ${promoteOpen ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-card-border text-foreground hover:border-primary/40"}`}>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-4.5 h-4.5 text-primary" />
                </div>
                Share Today
              </button>

              {/* View Events */}
              <Link href="/events">
                <button className="w-full flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-card-border bg-card text-foreground text-xs font-semibold hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="w-4.5 h-4.5 text-primary" />
                  </div>
                  View Events
                </button>
              </Link>
            </div>

            {/* ── SECTION 3: Make Money ────────────────────────────────────── */}
            <div className="mb-6">
              <SectionLabel>Make Money</SectionLabel>
              <div className="space-y-2">
                <NavCard
                  href="/vendor/inbox"
                  icon={<MessageSquare className="w-5 h-5" />}
                  title="Messages & Leads"
                  description="Customer and organizer messages"
                  badge={unreadCount > 0 ? `${unreadCount}` : undefined}
                />
                <NavCard
                  href="/vendor/events"
                  icon={<CalendarCheck className="w-5 h-5" />}
                  title="Event Invitations"
                  description="View and respond to event invites"
                />
                <NavCard
                  href="/vendor/event-spots"
                  icon={<Ticket className="w-5 h-5" />}
                  title="Spot Marketplace"
                  description={`${approvedSpots} confirmed · Browse event and park spots`}
                  badge={pendingSpots > 0 ? `${pendingSpots}` : undefined}
                />
              </div>

              {/* Booking requests (inline if any exist) */}
              {!resLoading && reservations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Booking Requests
                    <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{reservations.length}</span>
                  </p>
                  <div className="space-y-2">
                    {reservations.map(r => (
                      <div key={r.id} className="p-4 rounded-2xl bg-card border border-border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-foreground text-sm">{r.name}</p>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">{r.eventDate}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                          {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.eventLocation}</span>
                        </div>
                        <p className="text-xs text-foreground bg-muted/50 rounded-lg p-2.5">{r.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 4: Promote Your Truck ────────────────────────────── */}
            <div className="mb-6">
              <SectionLabel>Promote Your Truck</SectionLabel>
              <div className="bg-gradient-to-r from-primary/8 to-secondary/8 border border-primary/15 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setPromoteOpen(o => !o)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Share today's location & schedule</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Drive traffic to your truck right now</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${promoteOpen ? "rotate-90" : ""}`} />
                </button>

                {promoteOpen && (
                  <div className="px-5 pb-5 space-y-3 border-t border-primary/10 pt-4">
                    <div className="bg-background rounded-xl p-3.5 border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Your Truck Link</p>
                        <button onClick={() => copyText(shareUrl, "url")} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                          {copied === "url" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === "url" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-foreground font-mono truncate">{shareUrl}</p>
                    </div>
                    <div className="bg-background rounded-xl p-3.5 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Ready-to-Post Caption</p>
                        <button onClick={() => copyText(shareCaption, "caption")} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                          {copied === "caption" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === "caption" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-line">{shareCaption}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={nativeShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
                        <Share2 className="w-4 h-4" />Share via Device
                      </button>
                      <Link href="/vendor/marketing">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                          <Sparkles className="w-4 h-4 text-primary" />AI Tools
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 5: Growth Tools ──────────────────────────────────── */}
            <div className="mb-6">
              <SectionLabel>Growth Tools</SectionLabel>
              <div className="space-y-2">
                <NavCard
                  href="/vendor/marketing"
                  icon={<Sparkles className="w-5 h-5" />}
                  title="Social Media Hub"
                  description="Create branded posts, generate captions, manage your queue"
                  badge="Pro"
                />
                <NavCard
                  href="/vendor/analytics"
                  icon={<BarChart2 className="w-5 h-5" />}
                  title="Analytics"
                  description="Profile views, favorites, and booking trends"
                />
              </div>
            </div>

            {/* ── SECTION 6: Manage Your Truck ─────────────────────────────── */}
            <div className="mb-6">
              <SectionLabel>Manage Your Truck</SectionLabel>
              <div className="space-y-2">
                <NavCard href="/vendor/truck"     icon={<Truck className="w-5 h-5" />}     title="Truck Profile"            description="Name, cuisine, description, and settings" />
                <NavCard href="/vendor/menu"      icon={<BookOpen className="w-5 h-5" />}   title="Menu"                     description={`${myTruck.menuItemCount ?? 0} items · Add and manage your menu`} />
                <NavCard href="/vendor/schedule"  icon={<Calendar className="w-5 h-5" />}   title="Schedule"                 description="Manage your upcoming stops and locations" />
                <NavCard href="/vendor/specials"  icon={<Megaphone className="w-5 h-5" />}  title="Specials & Announcements" description={`${specials.length} active · Post deals and news`} />
                <NavCard href="/vendor/branding"  icon={<Palette className="w-5 h-5" />}    title="Brand & Media"            description="Logo, cover photo, gallery, and menu images" />
              </div>
            </div>
          </>
        )}
      </div>

      {checkInModalOpen && myTruck && (
        <Suspense fallback={null}>
          <CheckInMapModal truckName={myTruck.name} onConfirm={handleCheckIn} onClose={() => setCheckInModalOpen(false)} />
        </Suspense>
      )}
    </Layout>
  );
}
