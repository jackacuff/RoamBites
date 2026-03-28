import { useAuth } from "@/hooks/use-auth";
import { useListTrucks } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";
import {
  MapPin, Globe, Phone, Calendar, Clock, Pencil, Plus, Star,
  ChevronRight, Eye, Truck, Tag, Megaphone, Wifi, WifiOff
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
      ))}
    </div>
  );
}

export default function VendorTruck() {
  const { user } = useAuth();
  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const [media, setMedia] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [specials, setSpecials] = useState<any[]>([]);

  const fallbackImg = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  useEffect(() => {
    if (!myTruck) return;
    fetch(getApiUrl(`/api/trucks/${myTruck.id}/media`))
      .then(r => r.ok ? r.json() : [])
      .then(d => setMedia(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(getApiUrl(`/api/trucks/${myTruck.id}/reviews`))
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setAvgRating(d.avgRating); })
      .catch(() => {});

    fetch(getApiUrl(`/api/trucks/${myTruck.id}/specials`))
      .then(r => r.json())
      .then(d => setSpecials(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [myTruck?.id]);

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  if (!myTruck) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">No Truck Profile Yet</h1>
          <p className="text-muted-foreground mb-8">Create your truck profile to start listing on RoamBites and reaching customers.</p>
          <Link href="/vendor/truck/edit">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90">
              <Plus className="w-5 h-5" />
              Create Truck Profile
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const coverMedia = media.find(m => m.type === "cover");
  const logoMedia = media.find(m => m.type === "logo");
  const gallery = media.filter(m => m.type === "gallery");
  const heroSrc = coverMedia?.url || (myTruck as any).coverImageUrl || myTruck.imageUrl || fallbackImg;

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    special: <Tag className="w-3.5 h-3.5 text-orange-500" />,
    discount: <Tag className="w-3.5 h-3.5 text-green-500" />,
    announcement: <Megaphone className="w-3.5 h-3.5 text-blue-500" />,
    event: <Calendar className="w-3.5 h-3.5 text-purple-500" />,
  };

  return (
    <Layout>
      {/* Vendor action bar */}
      <div className="sticky top-[80px] z-40 w-full bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>Preview — this is what customers see</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/trucks/${myTruck.id}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Eye className="w-3.5 h-3.5" />
                Live page
              </button>
            </Link>
            <Link href="/vendor/truck/edit">
              <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-[40vh] md:h-[50vh] bg-muted w-full overflow-hidden">
        <img src={heroSrc} alt={myTruck.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                {logoMedia && (
                  <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-lg">
                    <img src={logoMedia.url} alt={`${myTruck.name} logo`} className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full uppercase tracking-wider">{myTruck.cuisine}</span>
                    <StatusBadge status={myTruck.status} isLive={myTruck.isLive} className="shadow-lg border-none" />
                    {avgRating !== null && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/90 text-white text-sm font-bold rounded-full">
                        <Star className="w-3.5 h-3.5 fill-white" />
                        {avgRating.toFixed(1)}
                        <span className="font-normal opacity-80">({reviews.length})</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tight drop-shadow-md">{myTruck.name}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${myTruck.isLive ? "bg-green-500 text-white" : "bg-white/20 text-white"}`}>
                  {myTruck.isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  {myTruck.isLive ? "Live now" : "Offline"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main */}
          <div className="lg:col-span-2 space-y-10">

            {/* Not approved warning */}
            {!myTruck.isApproved && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Your truck is <strong>pending admin approval</strong> and won't appear publicly until approved.
              </div>
            )}

            {/* About */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">About</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {myTruck.description || <span className="italic">No description yet. <Link href="/vendor/truck/edit" className="text-primary hover:underline">Add one →</Link></span>}
              </p>
              <div className="mt-6 flex flex-wrap gap-6 border-y border-border py-6">
                {myTruck.currentCity && (
                  <div className="flex items-center text-foreground"><MapPin className="w-5 h-5 text-primary mr-2" /><span className="font-medium">Currently in {myTruck.currentCity}</span></div>
                )}
                {(myTruck as any).phone && (
                  <div className="flex items-center text-foreground"><Phone className="w-5 h-5 text-primary mr-2" /><span className="font-medium">{(myTruck as any).phone}</span></div>
                )}
                {(myTruck as any).website && (
                  <div className="flex items-center text-foreground"><Globe className="w-5 h-5 text-primary mr-2" />
                    <a href={(myTruck as any).website.startsWith("http") ? (myTruck as any).website : `https://${(myTruck as any).website}`} target="_blank" rel="noreferrer" className="font-medium hover:text-primary hover:underline">{(myTruck as any).website}</a>
                  </div>
                )}
              </div>
            </section>

            {/* Active Specials */}
            {specials.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-display font-bold text-foreground">Active Specials</h2>
                  <Link href="/vendor/specials" className="text-sm text-primary hover:underline flex items-center gap-1">Manage <ChevronRight className="w-4 h-4" /></Link>
                </div>
                <div className="space-y-3">
                  {specials.map(s => (
                    <div key={s.id} className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
                      <div className="mt-0.5">{TYPE_ICONS[s.type] ?? TYPE_ICONS.announcement}</div>
                      <div>
                        <p className="font-semibold text-foreground">{s.title}</p>
                        {s.body && <p className="text-sm text-muted-foreground">{s.body}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Photo Gallery */}
            {gallery.length > 0 && (
              <section>
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gallery.map((m, i) => (
                    <div key={m.id} className="rounded-xl overflow-hidden aspect-square border border-border">
                      <img src={m.url} alt={m.altText || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Schedule */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-foreground">Schedule</h2>
                <Link href="/vendor/schedule" className="text-sm text-primary hover:underline flex items-center gap-1">Edit <ChevronRight className="w-4 h-4" /></Link>
              </div>
              {myTruck.scheduleEntries && myTruck.scheduleEntries.length > 0 ? (
                <div className="space-y-4">
                  {myTruck.scheduleEntries.map((entry: any) => (
                    <div key={entry.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                      <div>
                        <h4 className="font-bold text-foreground text-lg mb-1">{entry.venueName}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-1" /> {entry.address}, {entry.city}
                        </div>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-xl min-w-[180px]">
                        <div className="flex items-center text-sm font-medium text-foreground mb-1">
                          <Calendar className="w-4 h-4 mr-2 text-primary" />
                          {format(new Date(entry.startDateTime), "EEE, MMM do")}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2 text-secondary" />
                          {format(new Date(entry.startDateTime), "h:mm a")} - {format(new Date(entry.endDateTime), "h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-muted rounded-2xl border border-dashed border-border text-center">
                  <p className="text-muted-foreground mb-2">No upcoming stops scheduled.</p>
                  <Link href="/vendor/schedule" className="text-sm text-primary hover:underline">Add schedule entries →</Link>
                </div>
              )}
            </section>

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-foreground">Reviews</h2>
                {avgRating !== null && (
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={avgRating} />
                    <span className="font-bold text-foreground">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({reviews.length})</span>
                  </div>
                )}
              </div>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="p-5 rounded-2xl bg-card border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{r.userName || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                        </div>
                        <StarDisplay rating={r.rating} />
                      </div>
                      <p className="text-muted-foreground text-sm">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick actions */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { href: "/vendor/truck/edit", label: "Edit Profile", icon: <Pencil className="w-4 h-4" /> },
                  { href: "/vendor/branding", label: "Update Photos & Logo", icon: <Globe className="w-4 h-4" /> },
                  { href: "/vendor/menu", label: "Edit Menu", icon: <Tag className="w-4 h-4" /> },
                  { href: "/vendor/schedule", label: "Edit Schedule", icon: <Calendar className="w-4 h-4" /> },
                  { href: "/vendor/specials", label: "Manage Specials", icon: <Megaphone className="w-4 h-4" /> },
                ].map(action => (
                  <Link key={action.href} href={action.href}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors text-left">
                      <span className="text-muted-foreground">{action.icon}</span>
                      {action.label}
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Profile Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Menu items</span>
                  <span className="font-semibold text-foreground">{myTruck.menuItemCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total reviews</span>
                  <span className="font-semibold text-foreground">{reviews.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. rating</span>
                  <span className="font-semibold text-foreground">{avgRating !== null ? `${avgRating.toFixed(1)} / 5` : "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active specials</span>
                  <span className="font-semibold text-foreground">{specials.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`font-semibold text-sm ${myTruck.isApproved ? "text-green-600" : "text-amber-600"}`}>
                    {myTruck.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
