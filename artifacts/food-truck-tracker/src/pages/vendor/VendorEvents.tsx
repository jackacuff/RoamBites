import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useListEvents, useRespondToEventInvite } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  invited: { label: "Invited", className: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
  declined: { label: "Declined", className: "bg-muted text-muted-foreground" },
};

export default function VendorEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const { data: events, isLoading } = useListEvents();
  const respondMutation = useRespondToEventInvite();

  const myInvitations = (events || []).flatMap((e: any) =>
    (e.trucks || [])
      .filter((et: any) => et.truckId === myTruck?.id)
      .map((et: any) => ({ ...et, event: e }))
  );

  const handleRespond = async (eventId: number, status: "confirmed" | "declined") => {
    if (!myTruck) return;
    try {
      await respondMutation.mutateAsync({ id: eventId, data: { truckId: myTruck.id, status } });
      toast({ title: status === "confirmed" ? "Confirmed! See you there!" : "Declined." });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!myTruck) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Create your truck profile to see event invitations.</p>
        <Link href="/vendor/truck" className="mt-4 inline-block text-primary hover:underline">Create Truck Profile →</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/vendor" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Event Invitations</h1>

        {isLoading ? (
          <LoadingSpinner />
        ) : myInvitations.length > 0 ? (
          <div className="space-y-4">
            {myInvitations.map((inv: any) => {
              const statusInfo = STATUS_LABELS[inv.status] || STATUS_LABELS.invited;
              return (
                <div key={`${inv.eventId}-${inv.truckId}`} className="bg-card border border-card-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <Link href={`/events/${inv.event.id}`}>
                        <h3 className="font-semibold text-foreground hover:text-primary cursor-pointer">{inv.event.name}</h3>
                      </Link>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(inv.event.startDateTime), "MMM d, yyyy · h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {inv.event.venueName}, {inv.event.city}
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {(inv.status === "invited" || inv.status === "pending") && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => handleRespond(inv.event.id, "confirmed")}
                        disabled={respondMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm Attendance
                      </button>
                      <button
                        onClick={() => handleRespond(inv.event.id, "declined")}
                        disabled={respondMutation.isPending}
                        className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No event invitations"
            description="Event organizers will send you invitations when they'd like your truck to participate."
          />
        )}
      </div>
    </Layout>
  );
}
