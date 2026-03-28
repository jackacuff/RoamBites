import { useParams, Link } from "wouter";
import { useGetEvent, useListTrucks, useUpdateEvent, useInviteTruckToEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2, Users, Calendar, MapPin, Globe, Lock, Ticket, DollarSign, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";

interface EventSpot {
  id: number;
  name: string;
  description: string | null;
  totalSlots: number;
  availableSlots: number;
  approvedCount: number;
  pendingCount: number;
  priceInCents: number;
  platformFeeInCents: number;
  requirements: string | null;
  vendorRules: string | null;
  isInstantBook: boolean;
  isActive: boolean;
  reservations: any[];
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-muted text-muted-foreground",
  invited: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
};

export default function OrganizerManageEvent() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eventId = Number(id);

  const { data: event, isLoading: eventLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });
  const { data: trucks } = useListTrucks();
  const updateMutation = useUpdateEvent();
  const inviteMutation = useInviteTruckToEvent();

  const [activeTab, setActiveTab] = useState<"trucks" | "spots">("trucks");
  const [inviting, setInviting] = useState(false);
  const [spots, setSpots] = useState<EventSpot[]>([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [showSpotForm, setShowSpotForm] = useState(false);
  const [savingSpot, setSavingSpot] = useState(false);
  const [spotForm, setSpotForm] = useState({
    name: "Vendor Spot",
    description: "",
    totalSlots: "1",
    priceInCents: "0",
    platformFeeInCents: "0",
    requirements: "",
    vendorRules: "",
    isInstantBook: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });

  const loadSpots = async () => {
    setSpotsLoading(true);
    try {
      const [spotsRes, resRes] = await Promise.all([
        fetch(getApiUrl(`/api/events/${eventId}/spots`), { headers: authHeaders() }),
        fetch(getApiUrl(`/api/events/${eventId}/spot-reservations`), { headers: authHeaders() }),
      ]);
      if (spotsRes.ok) setSpots(await spotsRes.json());
      if (resRes.ok) setReservations(await resRes.json());
    } catch {}
    setSpotsLoading(false);
  };

  useEffect(() => { if (eventId) loadSpots(); }, [eventId]);

  const inviteTruck = async (truckId: number) => {
    try {
      await inviteMutation.mutateAsync({ id: eventId, data: { truckId } });
      toast({ title: "Invitation sent!" });
      setInviting(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const removeTruck = async (truckId: number) => {
    if (!confirm("Remove this truck from the event?")) return;
    try {
      await fetch(`/api/events/${eventId}/trucks/${truckId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast({ title: "Truck removed" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const togglePublish = async () => {
    if (!event) return;
    try {
      await updateMutation.mutateAsync({ id: eventId, data: { isPublished: !(event as any).isPublished } as any });
      toast({ title: (event as any).isPublished ? "Event unpublished" : "Event published!" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateSpot = async () => {
    setSavingSpot(true);
    try {
      const res = await fetch(getApiUrl(`/api/events/${eventId}/spots`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ...spotForm,
          totalSlots: parseInt(spotForm.totalSlots) || 1,
          priceInCents: Math.round(parseFloat(spotForm.priceInCents) * 100) || 0,
          platformFeeInCents: Math.round(parseFloat(spotForm.platformFeeInCents) * 100) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to create spot");
      toast({ title: "Vendor spot created!" });
      setShowSpotForm(false);
      setSpotForm({ name: "Vendor Spot", description: "", totalSlots: "1", priceInCents: "0", platformFeeInCents: "0", requirements: "", vendorRules: "", isInstantBook: false });
      loadSpots();
    } catch {
      toast({ title: "Error creating spot", variant: "destructive" });
    } finally { setSavingSpot(false); }
  };

  const handleReservationAction = async (reservationId: number, status: string) => {
    await fetch(getApiUrl(`/api/events/${eventId}/spot-reservations/${reservationId}`), {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast({ title: status === "approved" ? "Application approved!" : "Application rejected" });
    loadSpots();
  };

  const deleteSpot = async (spotId: number) => {
    if (!confirm("Delete this vendor spot?")) return;
    await fetch(getApiUrl(`/api/events/${eventId}/spots/${spotId}`), { method: "DELETE", headers: authHeaders() });
    toast({ title: "Spot deleted" });
    loadSpots();
  };

  if (eventLoading) return <Layout><LoadingSpinner /></Layout>;
  if (!event) return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold">Event not found</h2>
        <Link href="/organizer" className="text-primary hover:underline">← Back to Dashboard</Link>
      </div>
    </Layout>
  );

  const invitedTruckIds = new Set(event.trucks.map(et => et.truckId));
  const availableTrucks = (trucks || []).filter(t => !invitedTruckIds.has(t.id));
  const pendingReservations = reservations.filter(r => r.status === "pending");

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/organizer" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              {(event as any).isPublished ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <Globe className="w-3 h-3" />Published
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <Lock className="w-3 h-3" />Draft
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(event.startDateTime), "MMM d, yyyy · h:mm a")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.venueName}, {event.city}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/organizer/events/${eventId}/edit`}>
              <button className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Edit Details</button>
            </Link>
            <button
              onClick={togglePublish}
              disabled={updateMutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 ${(event as any).isPublished ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
            >
              {(event as any).isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Invited", count: event.trucks.length, color: "text-foreground" },
            { label: "Confirmed", count: event.trucks.filter(t => t.status === "confirmed").length, color: "text-green-600" },
            { label: "Declined", count: event.trucks.filter(t => t.status === "declined").length, color: "text-muted-foreground" },
            { label: "Spot Applications", count: pendingReservations.length, color: pendingReservations.length > 0 ? "text-amber-600" : "text-foreground" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "trucks", label: "Truck Invitations", icon: Users },
            { id: "spots", label: `Vendor Spots ${spots.length > 0 ? `(${spots.length})` : ""}`, icon: Ticket },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "spots" && pendingReservations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">{pendingReservations.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "trucks" && (
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Invited Trucks
              </h2>
              <button
                onClick={() => setInviting(!inviting)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Invite Truck
              </button>
            </div>

            {inviting && (
              <div className="mb-4 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium text-foreground mb-3">Select a truck to invite:</p>
                {availableTrucks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All approved trucks have already been invited.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {availableTrucks.map(truck => (
                      <div key={truck.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                        <div>
                          <p className="font-medium text-foreground">{truck.name}</p>
                          <p className="text-sm text-muted-foreground">{truck.cuisine}</p>
                        </div>
                        <button
                          onClick={() => inviteTruck(truck.id)}
                          disabled={inviteMutation.isPending}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {event.trucks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No trucks invited yet.</p>
            ) : (
              <div className="space-y-3">
                {event.trucks.map(et => (
                  et.truck && (
                    <div key={et.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {et.truck.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{et.truck.name}</p>
                          <p className="text-sm text-muted-foreground">{et.truck.cuisine}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[et.status] || ''}`}>
                          {et.status.charAt(0).toUpperCase() + et.status.slice(1)}
                        </span>
                        <button
                          onClick={() => removeTruck(et.truck!.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "spots" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Vendor Spot Marketplace
              </h2>
              <button
                onClick={() => setShowSpotForm(!showSpotForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Create Spot
              </button>
            </div>

            {showSpotForm && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4">New Vendor Spot</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground block mb-1">Spot Name *</label>
                    <input type="text" value={spotForm.name} onChange={e => setSpotForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground block mb-1">Description</label>
                    <textarea value={spotForm.description} onChange={e => setSpotForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Available Slots</label>
                    <input type="number" min="1" value={spotForm.totalSlots} onChange={e => setSpotForm(f => ({ ...f, totalSlots: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Spot Price ($)</label>
                    <input type="number" min="0" step="0.01" value={spotForm.priceInCents} onChange={e => setSpotForm(f => ({ ...f, priceInCents: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Platform Fee ($)</label>
                    <input type="number" min="0" step="0.01" value={spotForm.platformFeeInCents} onChange={e => setSpotForm(f => ({ ...f, platformFeeInCents: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="instantBook" checked={spotForm.isInstantBook} onChange={e => setSpotForm(f => ({ ...f, isInstantBook: e.target.checked }))}
                      className="w-4 h-4" />
                    <label htmlFor="instantBook" className="text-sm font-medium text-foreground">Instant Book (no approval needed)</label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground block mb-1">Requirements</label>
                    <textarea value={spotForm.requirements} onChange={e => setSpotForm(f => ({ ...f, requirements: e.target.value }))}
                      placeholder="e.g. Must have valid food permit, generator required..." rows={2}
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:border-primary resize-none" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleCreateSpot} disabled={savingSpot}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    {savingSpot && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingSpot ? "Creating..." : "Create Spot"}
                  </button>
                  <button onClick={() => setShowSpotForm(false)} className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted">Cancel</button>
                </div>
              </div>
            )}

            {spotsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : spots.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-12 text-center">
                <Ticket className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                <p className="text-foreground font-medium mb-1">No vendor spots created</p>
                <p className="text-sm text-muted-foreground">Create spots above so food trucks can apply to participate.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {spots.map(spot => {
                  const spotReservations = reservations.filter(r => r.spotId === spot.id);
                  const totalCents = spot.priceInCents + spot.platformFeeInCents;
                  return (
                    <div key={spot.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{spot.name}</h3>
                          {spot.description && <p className="text-sm text-muted-foreground">{spot.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-foreground">${(totalCents / 100).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{spot.availableSlots}/{spot.totalSlots} open</p>
                          </div>
                          <button onClick={() => deleteSpot(spot.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${spot.isInstantBook ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {spot.isInstantBook ? "Instant Book" : "Approval Required"}
                        </span>
                        {spot.approvedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">{spot.approvedCount} approved</span>
                        )}
                        {spot.pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{spot.pendingCount} pending review</span>
                        )}
                      </div>

                      {spotReservations.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Applications</p>
                          {spotReservations.map(r => {
                            const truck = r.truck;
                            return (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                                <div>
                                  <p className="font-medium text-foreground text-sm">{truck?.name || "Unknown Truck"}</p>
                                  <p className="text-xs text-muted-foreground">{truck?.cuisine}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.status === "pending" ? (
                                    <>
                                      <button onClick={() => handleReservationAction(r.id, "approved")}
                                        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleReservationAction(r.id, "rejected")}
                                        className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "approved" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                      {r.status === "approved" ? <CheckCircle className="w-3 h-3" /> : r.status === "pending" ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
