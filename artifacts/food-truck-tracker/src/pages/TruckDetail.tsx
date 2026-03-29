import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { MapView } from "@/components/MapView";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, Globe, Phone, Calendar, Clock, ChevronLeft, Heart, Star, Bell, Send, Loader2, CalendarCheck, Share2 } from "lucide-react";
import { SocialShareButton } from "@/components/SocialShare";
import { useGetTruck } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
        >
          <Star className={`w-6 h-6 transition-colors ${(hover || value) >= i ? "fill-amber-400 text-amber-400" : "text-border hover:text-amber-300"}`} />
        </button>
      ))}
    </div>
  );
}

export default function TruckDetail() {
  const [, params] = useRoute("/trucks/:id");
  const id = params?.id || "0";

  const { data: truck, isLoading, error } = useGetTruck(id);
  const { user, isAuthenticated } = useAuth();
  const fallbackImg = `${import.meta.env.BASE_URL}images/truck-placeholder.png`;

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyNearby, setNotifyNearby] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);

  const [reservationOpen, setReservationOpen] = useState(false);
  const [resForm, setResForm] = useState({ name: user?.name || "", email: "", phone: "", eventDate: "", eventLocation: "", message: "" });
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resSuccess, setResSuccess] = useState(false);
  const [resError, setResError] = useState("");

  const [media, setMedia] = useState<any[]>([]);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const token = localStorage.getItem("token");

  const truckId = truck?.id;

  useEffect(() => {
    if (!id) return;
    fetch(getApiUrl(`/api/trucks/${id}/media`))
      .then(r => r.ok ? r.json() : [])
      .then(data => setMedia(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(getApiUrl(`/api/trucks/${id}/reviews`))
      .then(r => r.json())
      .then(data => {
        setReviews(data.reviews || []);
        setAvgRating(data.avgRating);
        setReviewTotal(data.total);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !token || !truckId) return;
    fetch(getApiUrl("/api/favorites"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setIsFav(data.some((f: any) => f.truckId === truckId));
      })
      .catch(() => {});
    fetch(getApiUrl("/api/notifications"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const pref = data.find((p: any) => p.truckId === truckId);
          if (pref) { setNotifyOpen(pref.notifyWhenOpen); setNotifyNearby(pref.notifyWhenNearby); }
        }
      })
      .catch(() => {});
  }, [isAuthenticated, token, truckId]);

  const toggleFavorite = async () => {
    if (!isAuthenticated || !token) return;
    setFavLoading(true);
    try {
      if (isFav) {
        await fetch(getApiUrl(`/api/favorites/${truckId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setIsFav(false);
      } else {
        await fetch(getApiUrl("/api/favorites"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ truckId }),
        });
        setIsFav(true);
      }
    } catch {}
    setFavLoading(false);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating) { setReviewError("Please select a rating."); return; }
    if (!reviewComment.trim()) { setReviewError("Please write a comment."); return; }
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/api/reviews"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ truckId, rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        setReviewError(err.error || "Failed to submit review.");
      } else {
        const newReview = await res.json();
        setReviews(prev => [{ ...newReview, userName: user?.name || "You" }, ...prev]);
        setReviewTotal(t => t + 1);
        const allRatings = [...reviews.map(r => r.rating), reviewRating];
        setAvgRating(allRatings.reduce((a, b) => a + b, 0) / allRatings.length);
        setReviewRating(0);
        setReviewComment("");
      }
    } catch { setReviewError("Network error. Please try again."); }
    setReviewSubmitting(false);
  };

  const saveNotifications = async () => {
    if (!token) return;
    setNotifySaving(true);
    try {
      await fetch(getApiUrl("/api/notifications"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ truckId, notifyWhenOpen: notifyOpen, notifyWhenNearby: notifyNearby }),
      });
    } catch {}
    setNotifySaving(false);
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResError("");
    setResSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/api/reservations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...resForm, truckId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setResError(err.error || "Failed to send reservation request.");
      } else {
        setResSuccess(true);
      }
    } catch { setResError("Network error. Please try again."); }
    setResSubmitting(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !truck) {
    return (
      <Layout>
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold text-foreground">Truck not found</h2>
          <button onClick={() => window.history.back()} className="mt-4 text-primary hover:underline">Go Back</button>
        </div>
      </Layout>
    );
  }

  const hasReviewed = reviews.some((r: any) => r.userId === user?.id);

  return (
    <Layout>
      {/* Hero Header */}
      {(() => {
        const coverMedia = media.find(m => m.type === "cover");
        const logoMedia = media.find(m => m.type === "logo");
        const heroSrc = coverMedia?.url || (truck as any).coverImageUrl || truck.imageUrl || fallbackImg;
        return (
        <div className="relative h-[40vh] md:h-[50vh] bg-muted w-full overflow-hidden">
          <img src={heroSrc} alt={truck.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <button onClick={() => window.history.back()} className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  {logoMedia && (
                    <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-lg">
                      <img src={logoMedia.url} alt={`${truck.name} logo`} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full uppercase tracking-wider">{truck.cuisine}</span>
                      <StatusBadge status={truck.status} isLive={truck.isLive} className="shadow-lg border-none" />
                      {avgRating != null && typeof avgRating === "number" && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/90 text-white text-sm font-bold rounded-full">
                          <Star className="w-3.5 h-3.5 fill-white" />
                          {avgRating.toFixed(1)}
                          <span className="font-normal opacity-80">({reviewTotal})</span>
                        </span>
                      )}
                      {(truck as any).favoritesCount > 0 && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-red-500/80 text-white text-sm font-bold rounded-full">
                          <Heart className="w-3.5 h-3.5 fill-white" />
                          {(truck as any).favoritesCount}
                          <span className="font-normal opacity-80">favorited</span>
                        </span>
                      )}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tight drop-shadow-md">{truck.name}</h1>
                  </div>
                </div>
              {isAuthenticated && (
                <button
                  onClick={toggleFavorite}
                  disabled={favLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-lg ${isFav ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 backdrop-blur text-white border border-white/30 hover:bg-white/20"}`}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-white" : ""}`} />
                  {isFav ? "Favorited" : "Favorite"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      );
      })()}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">

            {/* About */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">About</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{truck.description || "No description provided."}</p>
              <div className="mt-6 flex flex-wrap gap-6 border-y border-border py-6">
                {truck.currentCity && (
                  <div className="flex items-center text-foreground"><MapPin className="w-5 h-5 text-primary mr-2" /><span className="font-medium">Currently in {truck.currentCity}</span></div>
                )}
                {truck.phone && (
                  <div className="flex items-center text-foreground"><Phone className="w-5 h-5 text-primary mr-2" /><span className="font-medium">{truck.phone}</span></div>
                )}
                {truck.website && (
                  <div className="flex items-center text-foreground"><Globe className="w-5 h-5 text-primary mr-2" />
                    <a href={truck.website.startsWith("http") ? truck.website : `https://${truck.website}`} target="_blank" rel="noreferrer" className="font-medium hover:text-primary hover:underline">{truck.website}</a>
                  </div>
                )}
              </div>
              {/* Social Media Links */}
              {((truck as any).twitterHandle || (truck as any).instagramHandle || (truck as any).tiktokHandle || (truck as any).facebookUrl || (truck as any).youtubeUrl) && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-foreground mb-2">Follow us</p>
                  <div className="flex flex-wrap gap-2">
                    {(truck as any).twitterHandle && (
                      <a href={`https://twitter.com/${(truck as any).twitterHandle}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        @{(truck as any).twitterHandle}
                      </a>
                    )}
                    {(truck as any).instagramHandle && (
                      <a href={`https://instagram.com/${(truck as any).instagramHandle}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white text-xs font-medium hover:opacity-90 transition-opacity">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        @{(truck as any).instagramHandle}
                      </a>
                    )}
                    {(truck as any).tiktokHandle && (
                      <a href={`https://tiktok.com/@${(truck as any).tiktokHandle}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.67a8.28 8.28 0 004.84 1.55V6.78a4.85 4.85 0 01-1.07-.09z" /></svg>
                        @{(truck as any).tiktokHandle}
                      </a>
                    )}
                    {(truck as any).facebookUrl && (
                      <a href={(truck as any).facebookUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2] text-white text-xs font-medium hover:bg-[#166FE5] transition-colors">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        Facebook
                      </a>
                    )}
                    {(truck as any).youtubeUrl && (
                      <a href={(truck as any).youtubeUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF0000] text-white text-xs font-medium hover:bg-red-700 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                        YouTube
                      </a>
                    )}
                    <SocialShareButton
                      options={{
                        title: truck.name,
                        text: `Check out ${truck.name} on RoamBites!`,
                        url: window.location.href,
                      }}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Photo Gallery */}
            {(() => {
              const gallery = media.filter(m => m.type === "gallery");
              if (gallery.length === 0) return null;
              return (
                <section>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-4">Photos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gallery.map((m, i) => (
                      <button key={m.id} type="button" onClick={() => setGalleryIdx(i)}
                        className={`rounded-xl overflow-hidden border-2 transition ${galleryIdx === i ? "border-primary" : "border-transparent hover:border-primary/40"} aspect-square`}>
                        <img src={m.url} alt={m.altText || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {gallery.length > 0 && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-border shadow-sm aspect-video">
                      <img src={gallery[galleryIdx]?.url} alt={gallery[galleryIdx]?.altText || "Selected photo"} className="w-full h-full object-cover" />
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Notifications (logged in only) */}
            {isAuthenticated && (
              <section className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold text-lg text-foreground">Notifications</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={notifyOpen} onChange={e => setNotifyOpen(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-foreground">Notify me when this truck goes live</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={notifyNearby} onChange={e => setNotifyNearby(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-foreground">Notify me when this truck is nearby</span>
                  </label>
                </div>
                <button
                  onClick={saveNotifications}
                  disabled={notifySaving}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {notifySaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save preferences
                </button>
              </section>
            )}

            {/* Reservation Request */}
            {(truck as any).isOpenForReservations && (
              <section className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold text-xl text-foreground">Book This Truck</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">Request {truck.name} for your private event or party.</p>
                {(truck as any).reservationNotes && (
                  <div className="mb-4 p-3 bg-background/60 rounded-xl border border-border text-sm text-muted-foreground">{(truck as any).reservationNotes}</div>
                )}
                {resSuccess ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium">
                    Request sent! The vendor will be in touch soon.
                  </div>
                ) : (
                  <form onSubmit={submitReservation} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input required value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                      <input required type="email" value={resForm.email} onChange={e => setResForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                      <input value={resForm.phone} onChange={e => setResForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                      <input required type="date" value={resForm.eventDate} onChange={e => setResForm(f => ({ ...f, eventDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                    </div>
                    <input required value={resForm.eventLocation} onChange={e => setResForm(f => ({ ...f, eventLocation: e.target.value }))} placeholder="Event location / address" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                    <textarea required value={resForm.message} onChange={e => setResForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell them about your event (expected attendance, duration, etc.)" rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none" />
                    {resError && <p className="text-sm text-destructive">{resError}</p>}
                    <button type="submit" disabled={resSubmitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {resSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Request
                    </button>
                  </form>
                )}
              </section>
            )}

            {/* Schedule */}
            <section>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">Where to find us</h2>
              {truck.scheduleEntries && truck.scheduleEntries.length > 0 ? (
                <div className="space-y-4">
                  {truck.scheduleEntries.map((entry: any) => (
                    <div key={entry.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row gap-4 justify-between sm:items-center group hover:border-primary/50 transition-colors">
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
                  <p className="text-muted-foreground">No upcoming stops scheduled.</p>
                </div>
              )}
            </section>

            {/* Map */}
            {truck.activeSchedule?.latitude && truck.activeSchedule?.longitude && (
              <section>
                <h2 className="text-2xl font-display font-bold text-foreground mb-6">Current Location</h2>
                <MapView trucks={[truck as any]} height="400px" center={[truck.activeSchedule.latitude, truck.activeSchedule.longitude]} zoom={14} />
              </section>
            )}

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-foreground">Reviews</h2>
                {avgRating != null && typeof avgRating === "number" && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={avgRating} />
                    <span className="font-bold text-foreground">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({reviewTotal})</span>
                  </div>
                )}
              </div>

              {isAuthenticated && !hasReviewed && (
                <form onSubmit={submitReview} className="mb-8 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                  <h3 className="font-semibold text-foreground">Write a review</h3>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your rating</p>
                    <StarPicker value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
                  />
                  {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
                  <button type="submit" disabled={reviewSubmitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Review
                  </button>
                </form>
              )}

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="p-5 rounded-2xl bg-card border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{r.userName || "Anonymous"}</p>
                          <StarRating rating={r.rating} />
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed mt-2">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-muted rounded-2xl border border-dashed border-border text-center">
                  <p className="text-muted-foreground">No reviews yet. Be the first!</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: Menu */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border rounded-3xl p-6 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 pb-4 border-b border-border">Menu</h2>
              {truck.menuItems && truck.menuItems.length > 0 ? (
                <div className="space-y-6">
                  {truck.menuItems.map((item: any) => (
                    <div key={item.id} className="group">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors pr-4">{item.name}</h4>
                        <span className="font-semibold text-primary whitespace-nowrap">${item.price.toFixed(2)}</span>
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Menu not available online.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
