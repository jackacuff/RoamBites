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
  Sparkles, BarChart2, Crown, TrendingUp, Zap, ChevronRight, Star, Rocket,
} from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";

type VendorSubscription = {
  id: number; status: string; trialEndsAt: string | null; currentPeriodEnd: string | null;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null; canceledAt: string | null;
  planId: number; planName: string; monthlyPrice: number; trialDaysLeft: number | null; features: string[];
};

// ── Subscription Banner ──────────────────────────────────────────────────────
function SubscriptionBanner({ sub, onSubscribe, onPortal, isLoading }: {
  sub: VendorSubscription | null;
  onSubscribe: () => void;
  onPortal: () => void;
  isLoading: boolean;
}) {
  if (!sub) return null;

  if (sub.status === "trialing" && sub.trialDaysLeft !== null) {
    const isUrgent = sub.trialDaysLeft <= 14;
    return (
      <div className={`mb-6 p-4 rounded-2xl border flex flex-col gap-4 ${isUrgent ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isUrgent ? "bg-amber-100 dark:bg-amber-900/40" : "bg-primary/10"}`}>
              <Crown className={`w-5 h-5 ${isUrgent ? "text-amber-600" : "text-primary"}`} />
            </div>
            <div>
              <p className={`font-bold text-sm ${isUrgent ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>
                {sub.trialDaysLeft === 0 ? "Your free trial ends today!" : `${sub.trialDaysLeft} days left on your free trial`}
              </p>
              <p className={`text-xs mt-0.5 ${isUrgent ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                {sub.planName} · ${sub.monthlyPrice.toFixed(2)}/mo · Keep your truck growing after trial
              </p>
            </div>
          </div>
          <button
            onClick={onSubscribe}
            disabled={isLoading}
            className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 shadow-sm ${isUrgent ? "bg-amber-600 text-white" : "bg-primary text-primary-foreground"}`}
          >
            <Rocket className="w-4 h-4" />
            {isLoading ? "Loading..." : "Go Pro"}
          </button>
        </div>
        {/* Value bullets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: "🔍", label: "Get found by more customers" },
            { icon: "📅", label: "Featured in event listings" },
            { icon: "📣", label: "Advanced social media tools" },
            { icon: "📍", label: "Live GPS location sharing" },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${isUrgent ? "bg-amber-100/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300" : "bg-background border border-border text-muted-foreground"}`}>
              <span>{item.icon}</span>
              <span className="font-medium leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sub.status === "active") {
    return (
      <div className="mb-6 p-4 rounded-2xl border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-green-800 dark:text-green-300">{sub.planName} — Active</p>
            {sub.currentPeriodEnd && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Renews {format(new Date(sub.currentPeriodEnd), "MMMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        {sub.stripeSubscriptionId && (
          <button
            onClick={onPortal}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-green-900/30 border border-green-300 text-green-800 dark:text-green-300 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            {isLoading ? "Loading..." : "Manage Billing"}
          </button>
        )}
      </div>
    );
  }

  if (sub.status === "past_due" || sub.status === "canceled") {
    return (
      <div className="mb-6 p-4 rounded-2xl border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-red-800 dark:text-red-300">
              {sub.status === "past_due" ? "Payment required — your listing may be hidden" : "Subscription canceled"}
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Reactivate to keep attracting customers and bookings</p>
          </div>
        </div>
        <button
          onClick={onSubscribe}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Rocket className="w-4 h-4" />
          {isLoading ? "Loading..." : "Reactivate"}
        </button>
      </div>
    );
  }

  return null;
}

// ── Lazy-loaded components ───────────────────────────────────────────────────
const CheckInMapModal = lazy(() =>
  import("@/components/CheckInMapModal").then((m) => ({ default: m.CheckInMapModal }))
);
const LiveMiniMap = lazy(() =>
  import("@/components/LiveMiniMap").then((m) => ({ default: m.LiveMiniMap }))
);

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="text-primary">{icon}</div>
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [specials, setSpecials] = useState<any[]>([]);
  const [mySpotReservations, setMySpotReservations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [parks, setParks] = useState<{ id: number; name: string; city: string; openSpots: number }[]>([]);
  const [selectedParkId, setSelectedParkId] = useState("");
  const [parkCheckingIn, setParkCheckingIn] = useState(false);

  const { data: subscription } = useQuery<VendorSubscription | null>({
    queryKey: ["/api/vendor/subscription"],
    queryFn: () =>
      fetch(getApiUrl("/api/vendor/subscription"), { headers: authHeaders() })
        .then(r => r.json()),
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: data.error || "Could not start checkout", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePortal = async () => {
    setBillingLoading(true);
    try {
      const r = await fetch(getApiUrl("/api/vendor/subscription/portal"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ title: data.error || "Could not open billing portal", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setBillingLoading(false);
    }
  };

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  useEffect(() => {
    fetch(getApiUrl("/api/vendor/reservations"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReservations(data); })
      .catch(() => {})
      .finally(() => setResLoading(false));

    fetch(getApiUrl("/api/vendor/specials"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSpecials(data.filter((s: any) => s.isActive)); })
      .catch(() => {});

    fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMySpotReservations(data); })
      .catch(() => {});

    fetch(getApiUrl("/api/messages/unread-count"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setUnreadCount(d.count || 0))
      .catch(() => {});

    fetch(getApiUrl("/api/parks"))
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setParks(data); })
      .catch(() => {});
  }, []);

  const checkInMutation = useCheckInTruck();
  const checkOutMutation = useCheckOutTruck();

  const handleCheckIn = async (lat?: number, lng?: number) => {
    if (!myTruck) return;
    try {
      await checkInMutation.mutateAsync({
        id: myTruck.id,
        data: lat !== undefined && lng !== undefined
          ? { latitude: lat, longitude: lng }
          : {},
      });
      toast({
        title: "You're live! 🎉",
        description: lat !== undefined
          ? `Broadcasting your location to customers.`
          : "Customers can see you're open.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      throw e;
    }
  };

  const handleCheckOut = async () => {
    if (!myTruck) return;
    try {
      await checkOutMutation.mutateAsync({ id: myTruck.id });
      toast({ title: "You're now offline. See you next time!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleParkCheckIn = async () => {
    if (!myTruck || !selectedParkId) return;
    setParkCheckingIn(true);
    try {
      const res = await fetch(getApiUrl(`/api/trucks/${myTruck.id}/park-checkin`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ parkId: parseInt(selectedParkId) }),
      });
      if (!res.ok) throw new Error("Check-in failed");
      const park = parks.find(p => p.id === parseInt(selectedParkId));
      toast({ title: `Checked in at ${park?.name ?? "the park"}!`, description: "Customers can see you're live here." });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch {
      toast({ title: "Check-in failed", variant: "destructive" });
    } finally {
      setParkCheckingIn(false);
    }
  };

  const handleParkCheckOut = async () => {
    if (!myTruck) return;
    try {
      await fetch(getApiUrl(`/api/trucks/${myTruck.id}/park-checkout`), {
        method: "POST",
        headers: authHeaders(),
      });
      toast({ title: "Checked out of park" });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch {
      toast({ title: "Error checking out", variant: "destructive" });
    }
  };

  const shareUrl = myTruck ? `${window.location.origin}/trucks/${myTruck.slug}` : "";
  const scheduleCaption = myTruck?.currentLocation
    ? `We're out today at ${myTruck.currentLocation}! Come find us and grab something delicious 🔥\nFind us on RoamBites: ${shareUrl}`
    : `Come find ${myTruck?.name} on RoamBites! Browse our menu and see where we'll be next.\n${shareUrl}`;

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: myTruck?.name, text: scheduleCaption, url: shareUrl });
    } else {
      copyText(shareUrl, "url");
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const subStatus = subscription?.status;
  const canGoLive = subStatus === "active" ||
    (subStatus === "trialing" && subscription?.trialDaysLeft !== null && (subscription?.trialDaysLeft ?? 0) >= 0);
  const pendingSpots = mySpotReservations.filter(r => r.status === "pending").length;
  const approvedSpots = mySpotReservations.filter(r => r.status === "approved").length;
  const isPro = subscription?.planName?.toLowerCase().includes("pro") && (subStatus === "active" || subStatus === "trialing");

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grow Your Business</h1>
            <p className="text-muted-foreground mt-1">
              {myTruck ? `Managing ${myTruck.name} · ${myTruck.isLive ? "🟢 Live now" : "⚫ Offline"}` : "Set up your truck to start reaching customers"}
            </p>
          </div>
          {myTruck && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 border border-border shrink-0">
              <div className={`w-2 h-2 rounded-full ${myTruck.isApproved ? "bg-green-500" : "bg-amber-500"}`} />
              {myTruck.isApproved ? "Approved & visible" : "Pending approval"}
            </div>
          )}
        </div>

        {/* ── Subscription Banner ─────────────────────────────────────────── */}
        <SubscriptionBanner
          sub={subscription ?? null}
          onSubscribe={handleSubscribe}
          onPortal={handlePortal}
          isLoading={billingLoading}
        />

        {/* ── No truck yet ────────────────────────────────────────────────── */}
        {!myTruck ? (
          <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
            <Truck className="w-16 h-16 mx-auto text-muted-foreground opacity-40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Truck Profile Yet</h2>
            <p className="text-muted-foreground mb-6">Create your truck profile to start listing your truck, attracting customers, and getting booked at events.</p>
            <Link href="/vendor/truck">
              <button className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90">
                <Plus className="w-5 h-5" />
                Create Truck Profile
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Live Status Card ─────────────────────────────────────────── */}
            <div className={`mb-2 p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${myTruck.isLive ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-card border-card-border"}`}>
              <div className="flex items-center gap-3">
                {myTruck.isLive ? (
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 dark:text-green-400">You're Live!</p>
                      {(myTruck as any).currentLatitude
                        ? <p className="text-xs text-green-700 dark:text-green-500 font-mono">{(myTruck as any).currentLatitude?.toFixed(5)}, {(myTruck as any).currentLongitude?.toFixed(5)}</p>
                        : myTruck.currentLocation
                          ? <p className="text-sm text-green-700 dark:text-green-500">At: {myTruck.currentLocation}</p>
                          : <p className="text-sm text-green-700 dark:text-green-500">Broadcasting · no pin dropped yet</p>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <WifiOff className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Currently Offline</p>
                      <p className="text-sm text-muted-foreground">Go live so customers can find you right now</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {myTruck.isLive ? (
                  <>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚚 ${myTruck.name} is LIVE! Find us now on RoamBites.`)}&url=${encodeURIComponent(`${window.location.origin}/trucks/${myTruck.id}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </a>
                    <button
                      onClick={() => setCheckInModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-800 rounded-xl text-sm font-semibold hover:bg-green-50"
                    >
                      <MapPin className="w-4 h-4" />
                      Update Location
                    </button>
                    <button
                      onClick={handleCheckOut}
                      disabled={checkOutMutation.isPending}
                      className="px-4 py-2 bg-white border border-green-300 text-green-800 rounded-xl text-sm font-semibold hover:bg-green-50 disabled:opacity-50"
                    >
                      {checkOutMutation.isPending ? "Going offline..." : "Go Offline"}
                    </button>
                  </>
                ) : canGoLive ? (
                  <button
                    onClick={() => setCheckInModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-sm"
                  >
                    <Wifi className="w-4 h-4" />
                    Go Live
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground">
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <span>Subscription required to go live</span>
                    </div>
                    <button
                      onClick={handleSubscribe}
                      disabled={billingLoading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {billingLoading ? "Loading..." : "Unlock Pro Features"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Park Check-In Widget ──────────────────────────────────────── */}
            {(() => {
              const currentParkId = (myTruck as any).currentParkId;
              const currentPark = currentParkId ? parks.find(p => p.id === currentParkId) : null;
              if (!canGoLive) return null;

              if (currentPark) {
                return (
                  <div className="mb-2 p-4 rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-400 text-sm">Checked in at {currentPark.name}</p>
                        <p className="text-xs text-green-700 dark:text-green-500">{currentPark.city} · Showing live on the park page</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/parks/${currentPark.id}`}>
                        <button className="px-3 py-1.5 rounded-xl border border-green-300 text-green-800 text-xs font-semibold hover:bg-green-100 transition-colors">
                          View Park
                        </button>
                      </Link>
                      <button
                        onClick={handleParkCheckOut}
                        className="px-3 py-1.5 rounded-xl bg-white border border-green-300 text-green-800 text-xs font-semibold hover:bg-green-50 transition-colors"
                      >
                        Leave Park
                      </button>
                    </div>
                  </div>
                );
              }

              if (parks.length === 0) return null;

              return (
                <div className="mb-2 p-4 rounded-2xl border border-border bg-gradient-to-r from-primary/3 to-secondary/3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">Check in at a Truck Park</p>
                  </div>
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <select
                      value={selectedParkId}
                      onChange={(e) => setSelectedParkId(e.target.value)}
                      className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select a park…</option>
                      {parks.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.city}{p.openSpots > 0 ? ` (${p.openSpots} open)` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleParkCheckIn}
                      disabled={!selectedParkId || parkCheckingIn}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {parkCheckingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                      Check In
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Live mini-map ─────────────────────────────────────────────── */}
            {myTruck.isLive && (myTruck as any).currentLatitude && (myTruck as any).currentLongitude && (
              <div className="mb-4">
                <Suspense fallback={<div className="h-48 rounded-2xl bg-muted animate-pulse" />}>
                  <LiveMiniMap
                    lat={(myTruck as any).currentLatitude}
                    lng={(myTruck as any).currentLongitude}
                    truckName={myTruck.name}
                  />
                </Suspense>
              </div>
            )}

            {/* ── Pending approval warning ──────────────────────────────────── */}
            {!myTruck.isApproved && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                Your truck is pending admin approval and won't appear publicly until approved.
              </div>
            )}

            {/* ── Quick Action Row ──────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => canGoLive ? setCheckInModalOpen(true) : handleSubscribe()}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border font-medium text-sm transition-all hover:shadow-sm ${myTruck.isLive ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100" : "bg-card border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${myTruck.isLive ? "bg-green-100" : "bg-primary/10"}`}>
                  {myTruck.isLive ? <MapPin className="w-5 h-5 text-green-600" /> : <Wifi className="w-5 h-5 text-primary" />}
                </div>
                <span>{myTruck.isLive ? "Update Location" : "Go Live"}</span>
              </button>
              <button
                onClick={() => setShareOpen(!shareOpen)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all hover:shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-primary" />
                </div>
                <span>Share Today</span>
              </button>
              <Link href="/events">
                <button className="w-full flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                  </div>
                  <span>View Events</span>
                </button>
              </Link>
            </div>

            {/* ── Promote Your Truck Today ──────────────────────────────────── */}
            <div className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Promote Your Truck Today
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Share your location, drive traffic to your RoamBites page, and post your schedule</p>
                </div>
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
                >
                  {shareOpen ? "Close" : "Share Now"}
                </button>
              </div>

              {!shareOpen && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: "📍 Share today's location", href: null, action: () => { setShareOpen(true); } },
                    { label: "📅 Post your schedule", href: "/vendor/schedule", action: null },
                    { label: "📣 Create social content", href: "/vendor/marketing", action: null },
                  ].map(item => (
                    item.href ? (
                      <Link key={item.label} href={item.href}>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/25 bg-background text-xs font-medium text-foreground hover:bg-primary/5 cursor-pointer transition-colors">{item.label} <ChevronRight className="w-3 h-3 opacity-50" /></span>
                      </Link>
                    ) : (
                      <button key={item.label} onClick={item.action ?? undefined} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/25 bg-background text-xs font-medium text-foreground hover:bg-primary/5 transition-colors">
                        {item.label} <ChevronRight className="w-3 h-3 opacity-50" />
                      </button>
                    )
                  ))}
                </div>
              )}

              {shareOpen && (
                <div className="space-y-3 mt-2">
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Your Truck Link</p>
                      <button onClick={() => copyText(shareUrl, "url")} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                        {copied === "url" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === "url" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-foreground font-mono truncate">{shareUrl}</p>
                  </div>
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Ready-to-Post Caption</p>
                      <button onClick={() => copyText(scheduleCaption, "caption")} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                        {copied === "caption" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === "caption" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-line">{scheduleCaption}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={nativeShare}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share via Device
                    </button>
                    <Link href="/vendor/marketing">
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Tools
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── Revenue & Opportunities Section ──────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={<TrendingUp className="w-4 h-4" />}
                title="Revenue & Opportunities"
                description="Bookings, events, and customer engagement"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NavCard
                  href="/vendor/event-spots"
                  icon={<Ticket className="w-6 h-6" />}
                  title="Spot Marketplace"
                  description={`${approvedSpots} confirmed · Browse event and park spots`}
                  badge={pendingSpots > 0 ? `${pendingSpots} pending` : undefined}
                  highlight
                />
                <NavCard
                  href="/vendor/events"
                  icon={<CalendarCheck className="w-6 h-6" />}
                  title="Event Invitations"
                  description="View and respond to event invites from organizers"
                />
                <NavCard
                  href="/vendor/inbox"
                  icon={<MessageSquare className="w-6 h-6" />}
                  title="Messages & Leads"
                  description="Customer and organizer messages · booking inquiries"
                  badge={unreadCount > 0 ? `${unreadCount} new` : undefined}
                />
                <NavCard
                  href="/vendor/specials"
                  icon={<Star className="w-6 h-6" />}
                  title="Specials & Announcements"
                  description={`${specials.length} active · Post deals, discounts, and news`}
                />
              </div>
            </div>

            {/* ── Social & Marketing Section ────────────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={<Sparkles className="w-4 h-4" />}
                title="Social & Marketing"
                description="Create content, grow your following, track performance"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NavCard
                  href="/vendor/marketing"
                  icon={<Share2 className="w-6 h-6" />}
                  title="Social Media Hub"
                  description="Create branded posts, generate AI captions, manage your queue"
                  badge={isPro ? undefined : "Pro"}
                  proStyle
                />
                <NavCard
                  href="/vendor/branding"
                  icon={<Palette className="w-6 h-6" />}
                  title="Brand & Media Assets"
                  description="Upload logo, cover photo, gallery, and menu images"
                />
                <NavCard
                  href="/vendor/analytics"
                  icon={<BarChart2 className="w-6 h-6" />}
                  title="Analytics"
                  description="Profile views, favorites, ratings, and booking trends"
                />
              </div>
            </div>

            {/* ── Setup & Profile Section ───────────────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={<Truck className="w-4 h-4" />}
                title="Your Truck Setup"
                description="Keep your profile, menu, and schedule up to date"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NavCard href="/vendor/truck"  icon={<Truck className="w-6 h-6" />}    title="Truck Profile" description="Edit your truck name, cuisine, and description" />
                <NavCard href="/vendor/menu"   icon={<BookOpen className="w-6 h-6" />} title="Menu"          description={`${myTruck.menuItemCount ?? 0} items · Add and manage your menu`} />
                <NavCard href="/vendor/schedule" icon={<Calendar className="w-6 h-6" />} title="Schedule"    description="Manage your upcoming stops and locations" />
              </div>
            </div>

            {/* ── Booking Requests Section ───────────────────────────────────── */}
            <div className="mb-8">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Booking Requests
                {reservations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{reservations.length}</span>
                )}
              </h2>
              {resLoading ? (
                <div className="p-6 bg-muted rounded-2xl text-center text-muted-foreground text-sm">Loading...</div>
              ) : reservations.length === 0 ? (
                <div className="p-5 bg-muted/40 rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No booking requests yet. Enable reservations in your <Link href="/vendor/truck"><span className="text-primary hover:underline cursor-pointer">Truck Profile</span></Link> to start receiving them.
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map(r => (
                    <div key={r.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-foreground text-lg">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.truckName}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold whitespace-nowrap">
                          {r.eventDate}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{r.email}</span>
                        {r.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{r.phone}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.eventLocation}</span>
                      </div>
                      <p className="text-sm text-foreground bg-muted/50 rounded-xl p-3">{r.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">Received {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Quick Stats ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{myTruck.menuItemCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Menu Items</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isApproved ? "text-green-600" : "text-amber-600"}`}>
                  {myTruck.isApproved ? "✓" : "⏳"}
                </p>
                <p className="text-sm text-muted-foreground">{myTruck.isApproved ? "Approved" : "Pending"}</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isLive ? "text-green-600" : "text-muted-foreground"}`}>
                  {myTruck.isLive ? "Live" : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Check-in Map Modal ───────────────────────────────────────────────── */}
      {checkInModalOpen && myTruck && (
        <Suspense fallback={null}>
          <CheckInMapModal
            truckName={myTruck.name}
            onConfirm={handleCheckIn}
            onClose={() => setCheckInModalOpen(false)}
          />
        </Suspense>
      )}
    </Layout>
  );
}

// ── Nav Card component ───────────────────────────────────────────────────────
function NavCard({
  href, icon, title, description, badge, highlight, proStyle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  highlight?: boolean;
  proStyle?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer flex items-start gap-4 relative border ${
        highlight
          ? "bg-primary/5 border-primary/25 hover:border-primary/50 hover:bg-primary/10"
          : proStyle
            ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 hover:border-amber-400"
            : "bg-card border-card-border hover:border-primary/40"
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          proStyle ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-primary/10 text-primary"
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        {badge && (
          <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold ${
            badge === "Pro" || badge === "Pro+" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-primary text-primary-foreground"
          }`}>{badge}</span>
        )}
        <ChevronRight className="absolute bottom-5 right-4 w-4 h-4 text-muted-foreground/40" />
      </div>
    </Link>
  );
}
