import { useAuth } from "@/hooks/use-auth";
import { useListEvents } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Users, Settings, Search, CreditCard, CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: events, isLoading } = useListEvents({});
  const { toast } = useToast();

  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [onboardLoading, setOnboardLoading] = useState(false);

  useEffect(() => {
    fetch(getApiUrl("/api/organizer/connect/status"), { headers: authHeaders() })
      .then(r => r.json())
      .then(setConnectStatus)
      .catch(() => setConnectStatus({ connected: false, onboardingComplete: false }))
      .finally(() => setConnectLoading(false));
  }, []);

  async function handleConnectStripe() {
    setOnboardLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/organizer/connect/onboard"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.error || "Failed to start onboarding", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setOnboardLoading(false);
    }
  }

  const myEvents = (events || []).filter((e: any) => e.organizerUserId === user?.id);
  const now = new Date();
  const upcomingEvents = myEvents.filter(e => new Date(e.endDateTime) >= now);
  const pastEvents = myEvents.filter(e => new Date(e.endDateTime) < now);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organizer Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your food truck events</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organizer/trucks">
              <button className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">
                <Search className="w-4 h-4" />
                Find Trucks
              </button>
            </Link>
            <Link href="/organizer/events/new">
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </Link>
          </div>
        </div>

        {/* Stripe Connect Payments Card */}
        <div className="mb-6 bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Payments</h2>
                <p className="text-sm text-muted-foreground">Collect spot fees from vendors via Stripe</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {connectLoading ? (
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking…</span>
              ) : connectStatus?.onboardingComplete ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Stripe connected
                  </span>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : connectStatus?.connected && !connectStatus.onboardingComplete ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" /> Setup incomplete
                  </span>
                  <button onClick={handleConnectStripe} disabled={onboardLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
                    {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Resume Setup
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Vendors can't pay spot fees until you connect.</span>
                  <button onClick={handleConnectStripe} disabled={onboardLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
                    {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Connect Stripe
                  </button>
                </div>
              )}
            </div>
          </div>
          {connectStatus?.onboardingComplete && (
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
              When a vendor pays a spot fee, 90% goes directly to your Stripe account and 10% goes to the platform.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-3xl font-bold text-foreground">{myEvents.length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <p className="text-3xl font-bold text-primary">{upcomingEvents.length}</p>
          </div>
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Past Events</p>
            <p className="text-3xl font-bold text-foreground">{pastEvents.length}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : myEvents.length > 0 ? (
          <div className="space-y-6">
            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
                <div className="space-y-3">
                  {upcomingEvents.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()).map(event => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Past Events</h2>
                <div className="space-y-3">
                  {pastEvents.map(event => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No events yet"
            description="Create your first food truck event and start inviting vendors."
            action={
              <Link href="/organizer/events/new">
                <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
                  Create Your First Event
                </button>
              </Link>
            }
          />
        )}
      </div>
    </Layout>
  );
}

function EventRow({ event }: { event: any }) {
  const confirmedCount = event.confirmedTruckCount || 0;
  const now = new Date();
  const isOngoing = new Date(event.startDateTime) <= now && new Date(event.endDateTime) >= now;
  const isPast = new Date(event.endDateTime) < now;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground">{event.name}</h3>
          {isOngoing && (
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Live</span>
          )}
          {isPast && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Past</span>
          )}
          {!event.isPublished && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Draft</span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(event.startDateTime), "MMM d, yyyy · h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.venueName}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {confirmedCount} truck{confirmedCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/events/${event.id}`}>
          <button className="px-3 py-1.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">View</button>
        </Link>
        <Link href={`/organizer/events/${event.id}/manage`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
            <Settings className="w-3.5 h-3.5" />
            Manage
          </button>
        </Link>
      </div>
    </div>
  );
}
