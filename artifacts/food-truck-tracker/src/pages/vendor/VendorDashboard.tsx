import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, BookOpen, Calendar, CalendarCheck, Wifi, WifiOff, Plus, ClipboardList, Mail, Phone, MapPin, Palette, Megaphone, Ticket, Share2, Copy, Check, Navigation, Loader2, Inbox } from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";

const CheckInMapModal = lazy(() =>
  import("@/components/CheckInMapModal").then((m) => ({ default: m.CheckInMapModal }))
);

const LiveMiniMap = lazy(() =>
  import("@/components/LiveMiniMap").then((m) => ({ default: m.LiveMiniMap }))
);

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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

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
      toast({ title: "Checked out. See you next time!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
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

  const pendingSpots = mySpotReservations.filter(r => r.status === "pending").length;
  const approvedSpots = mySpotReservations.filter(r => r.status === "approved").length;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Vendor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your food truck business</p>
        </div>

        {!myTruck ? (
          <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
            <Truck className="w-16 h-16 mx-auto text-muted-foreground opacity-40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Truck Profile Yet</h2>
            <p className="text-muted-foreground mb-6">Create your truck profile to start listing your truck and managing your menu and schedule.</p>
            <Link href="/vendor/truck">
              <button className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90">
                <Plus className="w-5 h-5" />
                Create Truck Profile
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Live Status Banner */}
            <div className={`mb-2 p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${myTruck.isLive ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-card border-card-border'}`}>
              <div className="flex items-center gap-3">
                {myTruck.isLive ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Wifi className="w-6 h-6 text-green-600" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                    </div>
                    <div>
                      <p className="font-bold text-green-800 dark:text-green-400">You're Live!</p>
                      {(myTruck as any).currentLatitude
                        ? <p className="text-xs text-green-700 dark:text-green-500 font-mono">{(myTruck as any).currentLatitude?.toFixed(5)}, {(myTruck as any).currentLongitude?.toFixed(5)}</p>
                        : myTruck.currentLocation
                          ? <p className="text-sm text-green-700 dark:text-green-500">At: {myTruck.currentLocation}</p>
                          : <p className="text-sm text-green-700 dark:text-green-500">Broadcasting · no pin set yet</p>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-foreground">Currently Offline</p>
                      <p className="text-sm text-muted-foreground">Go live to show customers where you are</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {myTruck.isLive ? (
                  <>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚚 ${myTruck.name} is LIVE${myTruck.currentCity ? ` in ${myTruck.currentCity}` : ""}! Find us now on RoamBites.`)}&url=${encodeURIComponent(`${window.location.origin}/trucks/${myTruck.id}`)}`}
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
                      Update Pin
                    </button>
                    <button
                      onClick={handleCheckOut}
                      disabled={checkOutMutation.isPending}
                      className="px-5 py-2.5 bg-white border border-green-300 text-green-800 rounded-xl font-semibold hover:bg-green-50 disabled:opacity-50"
                    >
                      {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setCheckInModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-sm"
                  >
                    <Wifi className="w-4 h-4" />
                    Go Live
                  </button>
                )}
              </div>
            </div>

            {/* Live mini-map */}
            {myTruck.isLive && (myTruck as any).currentLatitude && (myTruck as any).currentLongitude && (
              <div className="mb-6">
                <Suspense fallback={<div className="h-48 rounded-2xl bg-muted animate-pulse" />}>
                  <LiveMiniMap
                    lat={(myTruck as any).currentLatitude}
                    lng={(myTruck as any).currentLongitude}
                    truckName={myTruck.name}
                  />
                </Suspense>
              </div>
            )}

            {!myTruck.isApproved && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Your truck is pending admin approval. It won't appear publicly until approved.
              </div>
            )}

            {/* Nav Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <NavCard href="/vendor/truck" icon={<Truck className="w-6 h-6" />} title="Truck Profile" description="Edit your truck name, cuisine, and description" />
              <NavCard href="/vendor/menu" icon={<BookOpen className="w-6 h-6" />} title="Menu" description={`${myTruck.menuItemCount ?? 0} items · Add and manage your menu`} />
              <NavCard href="/vendor/schedule" icon={<Calendar className="w-6 h-6" />} title="Schedule" description="Manage your upcoming stops and locations" />
              <NavCard href="/vendor/events" icon={<CalendarCheck className="w-6 h-6" />} title="Event Invitations" description="View and respond to event invites" />
              <NavCard href="/vendor/branding" icon={<Palette className="w-6 h-6" />} title="Branding & Media" description="Upload logo, cover photo, gallery, and menu" />
              <NavCard href="/vendor/specials" icon={<Megaphone className="w-6 h-6" />} title="Specials & Announcements" description={`${specials.length} active · Post deals, discounts, and news`} />
              <NavCard
                href="/vendor/event-spots"
                icon={<Ticket className="w-6 h-6" />}
                title="Event Spot Marketplace"
                description={`${approvedSpots} confirmed · Browse and apply for event vendor spots`}
                badge={pendingSpots > 0 ? `${pendingSpots} pending` : undefined}
              />
              <NavCard
                href="/vendor/inbox"
                icon={<Inbox className="w-6 h-6" />}
                title="Inbox"
                description="Messages and event invitations from organizers"
                badge={unreadCount > 0 ? `${unreadCount} new` : undefined}
              />
            </div>

            {/* Share & Promote */}
            <div className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    Share & Promote
                  </h2>
                  <p className="text-sm text-muted-foreground">Share your profile and today's location with customers</p>
                </div>
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
                >
                  {shareOpen ? "Close" : "Share Now"}
                </button>
              </div>

              {shareOpen && (
                <div className="space-y-4">
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

                  <button
                    onClick={nativeShare}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
                  >
                    <Share2 className="w-4 h-4" />
                    Share via Device
                  </button>
                </div>
              )}
            </div>

            {/* Booking Requests */}
            <div className="mb-8">
              <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Booking Requests
                {reservations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{reservations.length}</span>
                )}
              </h2>
              {resLoading ? (
                <div className="p-6 bg-muted rounded-2xl text-center text-muted-foreground text-sm">Loading...</div>
              ) : reservations.length === 0 ? (
                <div className="p-6 bg-muted/40 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm">
                  No booking requests yet. Enable reservations in your Truck Profile to start receiving them.
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

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{myTruck.menuItemCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Menu Items</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                  {myTruck.isApproved ? "✓" : "⏳"}
                </p>
                <p className="text-sm text-muted-foreground">{myTruck.isApproved ? "Approved" : "Pending"}</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isLive ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {myTruck.isLive ? "Live" : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Check-in Map Modal */}
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

function NavCard({ href, icon, title, description, badge }: { href: string; icon: React.ReactNode; title: string; description: string; badge?: string }) {
  return (
    <Link href={href}>
      <div className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-start gap-4 relative">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {badge && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{badge}</span>
        )}
      </div>
    </Link>
  );
}
