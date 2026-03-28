import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarCheck, MapPin, DollarSign, Loader2, ArrowLeft, CheckCircle, Clock, XCircle, Ticket } from "lucide-react";
import { Link } from "wouter";

interface Spot {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  totalSlots: number;
  availableSlots: number;
  priceInCents: number;
  platformFeeInCents: number;
  requirements: string | null;
  vendorRules: string | null;
  isInstantBook: boolean;
  event?: {
    id: number;
    name: string;
    venueName: string;
    city: string;
    startDateTime: string;
  };
}

interface MyReservation {
  id: number;
  spotId: number;
  eventId: number;
  status: string;
  paymentStatus: string;
  paymentAmountInCents: number;
  notes: string | null;
  organizerMessage: string | null;
  createdAt: string;
  spot: { id: number; name: string; } | null;
  event: { id: number; name: string; venueName: string; city: string; startDateTime: string; } | null;
}

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { color: "bg-muted text-muted-foreground", icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { color: "bg-destructive/10 text-destructive", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function VendorEventSpots() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [myReservations, setMyReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/events"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEvents(d.filter(e => new Date(e.endDateTime) > new Date())); })
      .catch(() => {});
    loadMyReservations();
  }, [user]);

  const loadMyReservations = () => {
    fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMyReservations(d); })
      .catch(() => {});
  };

  const loadSpots = async (eventId: number) => {
    setLoading(true);
    const res = await fetch(getApiUrl(`/api/events/${eventId}/spots`), { headers: authHeaders() });
    const data = await res.json();
    const event = events.find(e => e.id === eventId);
    setSpots((Array.isArray(data) ? data : []).filter((s: any) => s.isActive).map((s: any) => ({ ...s, event })));
    setLoading(false);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    loadSpots(event.id);
  };

  const handleApply = async (spot: Spot, notes?: string) => {
    setApplying(spot.id);
    try {
      const res = await fetch(getApiUrl(`/api/events/${spot.eventId}/spots/${spot.id}/apply`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      toast({ title: spot.isInstantBook ? "Booked instantly!" : "Application submitted!", description: spot.isInstantBook ? "Your spot is confirmed." : "The organizer will review your request." });
      loadSpots(spot.eventId);
      loadMyReservations();
      setTab("mine");
    } catch {
      toast({ title: "Error applying", variant: "destructive" });
    } finally { setApplying(null); }
  };

  const appliedSpotIds = new Set(myReservations.filter(r => r.status !== "rejected" && r.status !== "cancelled").map(r => r.spotId));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/vendor" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" /> Event Spot Marketplace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Browse events looking for food trucks and apply for vendor spots.</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[{ id: "browse", label: "Browse Spots" }, { id: "mine", label: `My Applications ${myReservations.length > 0 ? `(${myReservations.length})` : ""}` }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "browse" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Events</h2>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events found.</p>
                ) : events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedEvent?.id === event.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
                  >
                    <p className="font-medium text-foreground text-sm">{event.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.city} · {format(new Date(event.startDateTime), "MMM d")}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              {!selectedEvent ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                  <p className="text-foreground font-medium">Select an event to see available spots</p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : spots.length === 0 ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                  <p className="text-foreground font-medium mb-1">No spots available</p>
                  <p className="text-sm text-muted-foreground">This event hasn't opened vendor spots yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">{selectedEvent.name} — Available Spots</h2>
                  {spots.map(spot => {
                    const alreadyApplied = appliedSpotIds.has(spot.id);
                    const isFull = spot.availableSlots <= 0;
                    const total = (spot.priceInCents + spot.platformFeeInCents) / 100;
                    return (
                      <div key={spot.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{spot.name}</h3>
                            {spot.description && <p className="text-sm text-muted-foreground mt-0.5">{spot.description}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-foreground">${total.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{spot.availableSlots}/{spot.totalSlots} open</p>
                          </div>
                        </div>
                        {spot.requirements && (
                          <div className="bg-muted/50 rounded-xl p-3 mb-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Requirements</p>
                            <p className="text-sm text-foreground">{spot.requirements}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {spot.isInstantBook ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Instant Book</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Approval Required</span>
                          )}
                          <div className="ml-auto">
                            {alreadyApplied ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">Applied</span>
                            ) : isFull ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">Full</span>
                            ) : (
                              <button
                                onClick={() => handleApply(spot)}
                                disabled={applying === spot.id}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {applying === spot.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                {spot.isInstantBook ? "Book Now" : "Apply"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "mine" && (
          <div>
            {myReservations.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                <Ticket className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-foreground font-medium mb-1">No applications yet</p>
                <p className="text-sm text-muted-foreground">Browse upcoming events and apply for vendor spots.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReservations.map(r => {
                  const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                  return (
                    <div key={r.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{r.event?.name || "Unknown Event"}</p>
                          <p className="text-sm text-muted-foreground">{r.spot?.name || "Spot"}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                          {style.icon}
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                      {r.event && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.event.city}</span>
                          <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />{format(new Date(r.event.startDateTime), "MMM d, yyyy")}</span>
                          {r.paymentAmountInCents > 0 && (
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(r.paymentAmountInCents / 100).toFixed(2)} — {r.paymentStatus}</span>
                          )}
                        </div>
                      )}
                      {r.organizerMessage && (
                        <div className="bg-muted/50 rounded-xl p-3 mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Organizer message</p>
                          <p className="text-sm text-foreground">{r.organizerMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
