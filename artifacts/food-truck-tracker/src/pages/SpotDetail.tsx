import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  MapPin, Clock, Users, Repeat, Calendar, CheckCircle, AlertCircle,
  MessageSquare, ChevronLeft, DollarSign, Info, Send,
} from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SPOT_TYPE_LABELS: Record<string, string> = {
  truck_park: "Truck Park",
  single_spot: "Single Spot",
  recurring_host: "Recurring Host",
  popup_opportunity: "Pop-Up Opportunity",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)} per spot`;
}

function ScheduleDisplay({ schedules, scheduleType }: { schedules: any[]; scheduleType: string }) {
  if (!schedules.length) return null;

  if (scheduleType === "recurring") {
    const byDay = schedules.filter(s => s.dayOfWeek != null);
    if (byDay.length) {
      return (
        <div className="flex flex-wrap gap-2">
          {byDay.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm">
              <span className="font-semibold text-purple-700">{DAY_NAMES[s.dayOfWeek]}</span>
              {s.startTime && <span className="text-purple-600">{s.startTime}{s.endTime ? ` – ${s.endTime}` : ""}</span>}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="space-y-2">
      {schedules.slice(0, 5).map(s => (
        <div key={s.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          {s.date && <span className="font-medium">{s.date}</span>}
          {s.startTime && <span className="text-muted-foreground">{s.startTime}{s.endTime ? ` – ${s.endTime}` : ""}</span>}
        </div>
      ))}
    </div>
  );
}

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [waitlisting, setWaitlisting] = useState(false);
  const [applicationNote, setApplicationNote] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [userStatus, setUserStatus] = useState<"none" | "pending" | "confirmed" | "waitlisted">("none");

  useEffect(() => {
    fetchListing();
  }, [id]);

  async function fetchListing() {
    try {
      const res = await fetch(getApiUrl(`/api/spots/${id}`));
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setListing(data);
    } catch {
      navigate("/spots");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest() {
    if (!isAuthenticated) { navigate("/login"); return; }
    setApplying(true);
    try {
      const res = await fetch(getApiUrl(`/api/spots/${id}/apply`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ notes: applicationNote }),
      });
      if (res.status === 409) {
        toast({ title: "Already requested", description: "You already have an active request for this spot." });
        setUserStatus("pending");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const application = await res.json();
      setUserStatus("pending");
      setShowRequestForm(false);
      // Navigate into the conversation thread
      navigate(`/vendor/inbox?thread=${application.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  async function handleWaitlist() {
    if (!isAuthenticated) { navigate("/login"); return; }
    setWaitlisting(true);
    try {
      const res = await fetch(getApiUrl(`/api/spots/${id}/waitlist`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 409) { toast({ title: "Already on waitlist" }); setUserStatus("waitlisted"); return; }
      if (!res.ok) throw new Error("Failed");
      setUserStatus("waitlisted");
      toast({ title: "Added to waitlist", description: "You'll be notified if a spot opens up." });
    } catch {
      toast({ title: "Error", description: "Failed to join waitlist.", variant: "destructive" });
    } finally {
      setWaitlisting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-xl w-1/2" />
          <div className="h-48 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!listing) return null;

  const isFull = listing.spotsAvailable === 0;
  const isOwner = user?.id === listing.hostUserId;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/spots">
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Spot Marketplace
          </button>
        </Link>

        <div className="w-full h-52 rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-primary/10 to-secondary/10">
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-16 h-16 text-primary/20" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {SPOT_TYPE_LABELS[listing.spotType] ?? listing.spotType}
                </span>
                {listing.scheduleType === "recurring" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                    <Repeat className="w-3 h-3" /> Recurring
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-foreground mb-1">{listing.title}</h1>
              {listing.hostName && <p className="text-muted-foreground text-sm">Hosted by {listing.hostName}</p>}
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {listing.address ? `${listing.address}, ${listing.city}` : listing.city}
              </p>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-semibold text-foreground mb-2">About this spot</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{listing.description}</p>
              </div>
            )}

            {listing.schedules?.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Availability
                </h2>
                <ScheduleDisplay schedules={listing.schedules} scheduleType={listing.scheduleType} />
              </div>
            )}

            {listing.requirements && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h2 className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4" /> Requirements
                </h2>
                <p className="text-amber-800 text-sm leading-relaxed">{listing.requirements}</p>
                {listing.requiresAcknowledgement && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">* You must acknowledge these requirements when requesting this spot.</p>
                )}
              </div>
            )}

            {listing.amenities?.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((a: string) => (
                    <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium capitalize">
                      <CheckCircle className="w-3 h-3 text-accent" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <h2 className="font-semibold text-blue-900 mb-3 text-sm flex items-center gap-2">
                <Info className="w-4 h-4" /> How spot requests work
              </h2>
              <ol className="space-y-1.5 text-xs text-blue-800">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Submit your request with a note about your truck.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>The host reviews and confirms, declines, or waitlists your request.</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span>On confirmation, both parties receive contact details to coordinate.</li>
              </ol>
            </div>
          </div>

          {/* Sidebar / Action card */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
              <div className="text-center mb-4">
                <p className="text-3xl font-extrabold text-primary">{formatPrice(listing.priceInCents)}</p>
                {listing.priceInCents > 0 && <p className="text-xs text-muted-foreground mt-0.5">per reservation</p>}
              </div>

              <div className={`flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl text-sm font-semibold ${isFull ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                <Users className="w-4 h-4" />
                {isFull ? "No spots available" : `${listing.spotsAvailable} of ${listing.spotsTotal} spot${listing.spotsTotal !== 1 ? "s" : ""} open`}
              </div>

              <div className="space-y-2 mb-5 text-sm">
                {listing.hasWaitlist && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Waitlist available</span>
                  </div>
                )}
                {listing.pendingApplications > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>{listing.pendingApplications} pending request{listing.pendingApplications !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              {isOwner ? (
                <Link href="/host">
                  <button className="w-full py-3 bg-muted text-foreground rounded-2xl text-sm font-semibold hover:bg-muted/80 transition-colors">
                    Manage This Listing
                  </button>
                </Link>
              ) : userStatus === "pending" ? (
                <div className="space-y-2">
                  <div className="w-full py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" /> Pending host approval
                  </div>
                  <Link href="/my-spots">
                    <button className="w-full py-2.5 border border-border rounded-2xl text-xs text-muted-foreground hover:bg-muted transition-colors">
                      View my spot requests
                    </button>
                  </Link>
                </div>
              ) : userStatus === "confirmed" ? (
                <div className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Request confirmed!
                </div>
              ) : userStatus === "waitlisted" ? (
                <div className="w-full py-3 bg-amber-50 text-amber-700 rounded-2xl text-sm font-semibold text-center flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" /> On waitlist
                </div>
              ) : !isFull ? (
                <>
                  {!showRequestForm ? (
                    <button
                      onClick={() => isAuthenticated ? setShowRequestForm(true) : navigate("/login")}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Request This Spot
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={applicationNote}
                        onChange={e => setApplicationNote(e.target.value)}
                        placeholder="Tell the host about your truck, cuisine type, and why you'd be a great fit…"
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      {listing.requiresAcknowledgement && listing.requirements && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2">
                          By requesting, you acknowledge the host's requirements.
                        </p>
                      )}
                      <button
                        onClick={handleRequest}
                        disabled={applying}
                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
                      >
                        {applying ? "Submitting…" : "Submit Request"}
                      </button>
                      <button onClick={() => setShowRequestForm(false)} className="w-full py-2.5 border border-border rounded-2xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : listing.hasWaitlist ? (
                <button
                  onClick={handleWaitlist}
                  disabled={waitlisting}
                  className="w-full py-3 border border-border text-foreground rounded-2xl text-sm font-semibold hover:bg-muted disabled:opacity-60 transition-colors"
                >
                  {waitlisting ? "Joining…" : "Join Waitlist"}
                </button>
              ) : (
                <div className="w-full py-3 bg-muted text-muted-foreground rounded-2xl text-sm font-semibold text-center">
                  Spot is full
                </div>
              )}

              {listing.host && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Hosted by</p>
                  <p className="text-sm font-semibold text-foreground">{listing.host.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
