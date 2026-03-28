import { Layout } from "@/components/Layout";
import { useListTrucks, useListEvents } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, authHeaders } from "@/lib/api";
import { Search, MapPin, Star, Wifi, Send, X, ChevronLeft, Check, Loader2, Filter } from "lucide-react";

export default function OrganizerTruckMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: trucks } = useListTrucks();
  const { data: events } = useListEvents({});
  const myEvents = (events || []).filter((e: any) => e.organizerUserId === user?.id && new Date(e.endDateTime) > new Date());

  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);

  const [inviteModal, setInviteModal] = useState<{ truck: any } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTrucks, setSentTrucks] = useState<Set<number>>(new Set());

  const approvedTrucks = (trucks || []).filter(t => t.isApproved);

  const cuisines = [...new Set(approvedTrucks.map(t => t.cuisine).filter(Boolean))].sort();
  const cities = [...new Set(approvedTrucks.map(t => (t as any).currentCity).filter(Boolean))].sort();

  const filtered = approvedTrucks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.cuisine.toLowerCase().includes(search.toLowerCase())) return false;
    if (cuisineFilter && t.cuisine !== cuisineFilter) return false;
    if (cityFilter && (t as any).currentCity !== cityFilter) return false;
    if (liveOnly && !t.isLive) return false;
    return true;
  });

  const openInvite = (truck: any) => {
    setInviteModal({ truck });
    setSelectedEvent(myEvents.length === 1 ? String(myEvents[0].id) : "");
    setInviteMessage("");
  };

  const handleSendInvite = async () => {
    if (!inviteModal) return;
    if (!selectedEvent) { toast({ title: "Please select an event", variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await fetch(getApiUrl(`/api/events/${selectedEvent}/invite`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ truckId: inviteModal.truck.id, message: inviteMessage }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to send invite", variant: "destructive" });
        return;
      }
      setSentTrucks(prev => new Set([...prev, inviteModal.truck.id]));
      toast({ title: `Invitation sent to ${inviteModal.truck.name}!`, description: "They'll receive a message in their inbox." });
      setInviteModal(null);
    } catch {
      toast({ title: "Error sending invite", variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/organizer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Truck Marketplace</h1>
              <p className="text-muted-foreground mt-1">Discover food trucks and invite them to your events</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> trucks available
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or cuisine..."
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <select
              value={cuisineFilter}
              onChange={e => setCuisineFilter(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
            >
              <option value="">All Cuisines</option>
              {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl bg-background text-sm cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={liveOnly} onChange={e => setLiveOnly(e.target.checked)} className="w-4 h-4 accent-primary" />
              Live only
            </label>
          </div>
          {(search || cuisineFilter || cityFilter || liveOnly) && (
            <button
              onClick={() => { setSearch(""); setCuisineFilter(""); setCityFilter(""); setLiveOnly(false); }}
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Truck Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto opacity-30 mb-3" />
            <p className="font-medium">No trucks match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(truck => {
              const alreadySent = sentTrucks.has(truck.id);
              return (
                <TruckCard
                  key={truck.id}
                  truck={truck}
                  alreadySent={alreadySent}
                  onInvite={() => openInvite(truck)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setInviteModal(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <button onClick={() => setInviteModal(null)} className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {inviteModal.truck.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Invite {inviteModal.truck.name}</h2>
                <p className="text-sm text-muted-foreground">{inviteModal.truck.cuisine}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Select Event *</label>
                {myEvents.length === 0 ? (
                  <div className="p-3 bg-muted rounded-xl text-sm text-muted-foreground">
                    No upcoming events. <Link href="/organizer/events/new" className="text-primary hover:underline">Create one first →</Link>
                  </div>
                ) : (
                  <select
                    value={selectedEvent}
                    onChange={e => setSelectedEvent(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Choose an event...</option>
                    {myEvents.map((e: any) => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name} — {new Date(e.startDateTime).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Personal Message <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  placeholder={`Hi! We'd love to have ${inviteModal.truck.name} at our event. We expect a great turnout and think your food would be a perfect fit...`}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendInvite}
                  disabled={sending || !selectedEvent}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending..." : "Send Invitation"}
                </button>
                <button onClick={() => setInviteModal(null)} className="px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function TruckCard({ truck, alreadySent, onInvite }: { truck: any; alreadySent: boolean; onInvite: () => void }) {
  const avgRating = truck.avgRating ? parseFloat(truck.avgRating) : null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col">
      <div className="relative h-36 bg-muted">
        {truck.imageUrl ? (
          <img src={truck.imageUrl} alt={truck.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-muted-foreground/30 bg-gradient-to-br from-primary/5 to-secondary/5">
            {truck.name.charAt(0)}
          </div>
        )}
        {truck.isLive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-white text-xs font-semibold shadow">
            <Wifi className="w-3 h-3" />
            Live
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-foreground leading-tight">{truck.name}</h3>
            {avgRating !== null && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">{truck.cuisine}</span>
          {truck.currentCity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3" />
              {truck.currentCity}
            </div>
          )}
          {truck.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{truck.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Link href={`/trucks/${truck.id}`}>
            <button className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
              View Profile
            </button>
          </Link>
          <button
            onClick={onInvite}
            disabled={alreadySent}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${alreadySent ? "bg-green-100 text-green-700 cursor-default" : "bg-primary text-primary-foreground hover:opacity-90"}`}
          >
            {alreadySent ? <><Check className="w-3.5 h-3.5" /> Invited</> : <><Send className="w-3.5 h-3.5" /> Invite</>}
          </button>
        </div>
      </div>
    </div>
  );
}
