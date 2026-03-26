import { useParams, Link } from "wouter";
import { useGetEvent, useListTrucks, useUpdateEvent, useInviteTruckToEvent } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2, Users, Calendar, MapPin, Globe, Lock } from "lucide-react";

export default function OrganizerManageEvent() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eventId = Number(id);

  const { data: event, isLoading: eventLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId }
  });
  const { data: trucks } = useListTrucks();
  const updateMutation = useUpdateEvent();
  const inviteMutation = useInviteTruckToEvent();

  const [inviting, setInviting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });

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
      await updateMutation.mutateAsync({ id: eventId, data: { isPublished: !event.isPublished } });
      toast({ title: event.isPublished ? "Event unpublished" : "Event published!" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
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

  const STATUS_STYLES: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    declined: "bg-muted text-muted-foreground",
    invited: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
  };

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
              {event.isPublished ? (
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
              className={`px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 ${event.isPublished ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
            >
              {event.isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Invited", count: event.trucks.length, color: "text-foreground" },
            { label: "Confirmed", count: event.trucks.filter(t => t.status === "confirmed").length, color: "text-green-600" },
            { label: "Declined", count: event.trucks.filter(t => t.status === "declined").length, color: "text-muted-foreground" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
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
            <p className="text-muted-foreground text-sm">No trucks invited yet. Use the button above to invite food trucks.</p>
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
      </div>
    </Layout>
  );
}
