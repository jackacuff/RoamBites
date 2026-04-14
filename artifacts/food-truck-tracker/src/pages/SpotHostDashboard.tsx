import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  MapPin, Plus, Users, Clock, Zap, Repeat, Calendar, ChevronRight,
  CheckCircle, X, MessageSquare, Building2, Home, BarChart2,
  Edit2, Eye, Trash2, Star, DollarSign, AlertCircle, MoreHorizontal,
} from "lucide-react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SPOT_TYPE_LABELS: Record<string, string> = {
  truck_park: "Truck Park",
  single_spot: "Single Spot",
  recurring_host: "Recurring Host",
  popup_opportunity: "Pop-Up",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatPrice(cents: number) {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(0)}/spot`;
}

function ApplicationRow({ app, onUpdate }: { app: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [hostMessage, setHostMessage] = useState(app.hostMessage ?? "");
  const [showMsg, setShowMsg] = useState(false);

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      const res = await fetch(getApiUrl(`/api/host/spots/applications/${app.id}`), {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, hostMessage }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `Application ${status}` });
      onUpdate();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-foreground text-sm">{app.truck?.name ?? "Unknown truck"}</p>
          <p className="text-xs text-muted-foreground">{app.vendor?.name} · {app.vendor?.email}</p>
          {app.truck?.cuisine && <p className="text-xs text-muted-foreground capitalize">{app.truck.cuisine}</p>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[app.status] ?? "bg-muted text-muted-foreground border-border"}`}>
          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
        </span>
      </div>
      {app.notes && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mb-3 italic">"{app.notes}"</p>
      )}
      {app.status === "pending" && (
        <div className="space-y-2">
          {showMsg && (
            <textarea
              value={hostMessage}
              onChange={e => setHostMessage(e.target.value)}
              placeholder="Optional message to vendor…"
              rows={2}
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus("approved")}
              disabled={updating}
              className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Approve
            </button>
            <button
              onClick={() => updateStatus("rejected")}
              disabled={updating}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              <X className="w-3.5 h-3.5 inline mr-1" /> Reject
            </button>
            <button
              onClick={() => setShowMsg(v => !v)}
              className="px-3 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2">{new Date(app.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

function ListingCard({ listing, onDelete }: { listing: any; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  async function loadApplications() {
    if (applications.length > 0) { setExpanded(v => !v); return; }
    setLoadingApps(true);
    try {
      const [appsRes, waitRes] = await Promise.all([
        fetch(getApiUrl(`/api/host/spots/${listing.id}/applications`), { headers: authHeaders() }),
        fetch(getApiUrl(`/api/host/spots/${listing.id}/waitlist`), { headers: authHeaders() }),
      ]);
      if (appsRes.ok) setApplications(await appsRes.json());
      if (waitRes.ok) setWaitlist(await waitRes.json());
      setExpanded(true);
    } catch {} finally { setLoadingApps(false); }
  }

  const isFull = listing.spotsAvailable === 0;
  const pendingCount = applications.filter(a => a.status === "pending").length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {SPOT_TYPE_LABELS[listing.spotType] ?? listing.spotType}
              </span>
              {listing.scheduleType === "recurring" && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 rounded-full px-2 py-0.5">
                  <Repeat className="w-2.5 h-2.5" /> Recurring
                </span>
              )}
            </div>
            <h3 className="font-bold text-foreground">{listing.title}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {listing.address ? `${listing.address}, ${listing.city}` : listing.city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-primary">{formatPrice(listing.priceInCents)}</p>
            <p className={`text-xs mt-0.5 font-medium ${isFull ? "text-red-600" : "text-emerald-600"}`}>
              {isFull ? "Full" : `${listing.spotsAvailable}/${listing.spotsTotal} open`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {listing.isInstantBook && (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <Zap className="w-3 h-3" /> Instant book
            </span>
          )}
          {listing.hasWaitlist && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <Clock className="w-3 h-3" /> Waitlist on
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Link href={`/spots/${listing.id}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Eye className="w-3 h-3" /> View
            </button>
          </Link>
          <button
            onClick={loadApplications}
            disabled={loadingApps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Users className="w-3 h-3" />
            Applications {pendingCount > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>}
            {loadingApps ? "…" : null}
          </button>
          <button
            onClick={() => onDelete(listing.id)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Applications panel */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-foreground">Applications</h4>
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No applications yet</p>
          ) : (
            <div className="space-y-3 mb-4">
              {applications.map(app => (
                <ApplicationRow key={app.id} app={app} onUpdate={loadApplications} />
              ))}
            </div>
          )}
          {waitlist.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Waitlist ({waitlist.length})
              </h4>
              <div className="space-y-2">
                {waitlist.map(w => (
                  <div key={w.id} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="font-medium">{w.vendor?.name}</span>
                    <span className="text-muted-foreground">{w.truck?.name ?? "No truck"}</span>
                    <span className="text-amber-600">{new Date(w.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SpotHostDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    fetchListings();
  }, [isAuthenticated]);

  async function fetchListings() {
    try {
      const res = await fetch(getApiUrl(`/api/host/spots`), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      setListings(await res.json());
    } catch {} finally { setLoading(false); }
  }

  async function deleteListing(id: number) {
    if (!confirm("Remove this listing?")) return;
    try {
      await fetch(getApiUrl(`/api/spots/${id}`), { method: "DELETE", headers: authHeaders() });
      setListings(l => l.filter(x => x.id !== id));
      toast({ title: "Listing removed" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  const totalSpots = listings.reduce((s, l) => s + l.spotsTotal, 0);
  const openSpots = listings.reduce((s, l) => s + l.spotsAvailable, 0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Host Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your spot listings and vendor applications.</p>
          </div>
          <Link href="/spots/new">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> List a Spot
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-foreground">{listings.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active listings</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{openSpots}</p>
            <p className="text-xs text-muted-foreground mt-1">Open spots</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-foreground">{totalSpots}</p>
            <p className="text-xs text-muted-foreground mt-1">Total spots</p>
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-36 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No listings yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create your first spot listing and start connecting with food trucks in your area.
            </p>
            <Link href="/spots/new">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity">
                List your first spot
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} onDelete={deleteListing} />
            ))}
          </div>
        )}

        {/* Help section */}
        {listings.length > 0 && (
          <div className="mt-10 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-2">Need help managing your listings?</h3>
            <p className="text-muted-foreground text-sm">
              Browse the <Link href="/spots"><span className="text-primary hover:underline cursor-pointer">Spot Marketplace</span></Link> to see how your listings appear to food trucks.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
