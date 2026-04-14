import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  MapPin, Plus, Users, Clock, Repeat, Calendar, ChevronRight,
  CheckCircle, X, MessageSquare, BarChart2,
  Eye, Trash2, AlertCircle, ThumbsDown, ListOrdered,
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_host_approval: { label: "Pending Review", color: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed:             { label: "Confirmed",      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined:              { label: "Declined",        color: "bg-red-50 text-red-700 border-red-200" },
  waitlisted:            { label: "Waitlisted",     color: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled:             { label: "Cancelled",      color: "bg-gray-100 text-gray-500 border-gray-200" },
};

function formatPrice(cents: number) {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(0)}/spot`;
}

function ApplicationRow({ app, listingId, onUpdate }: { app: any; listingId: number; onUpdate: () => void }) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [showDeclineMsg, setShowDeclineMsg] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");

  const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, color: "bg-muted text-muted-foreground border-border" };
  const isPending = app.status === "pending_host_approval";

  async function updateStatus(status: string, hostMessage?: string) {
    setUpdating(true);
    try {
      const res = await fetch(getApiUrl(`/api/host/spots/applications/${app.id}`), {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, hostMessage: hostMessage ?? "" }),
      });
      if (!res.ok) throw new Error("Failed");
      const labels: Record<string, string> = {
        confirmed: "Request confirmed ✅",
        declined: "Request declined",
        waitlisted: "Added to waitlist",
      };
      toast({ title: labels[status] ?? `Status updated to ${status}` });
      onUpdate();
    } catch {
      toast({ title: "Error updating request", variant: "destructive" });
    } finally {
      setUpdating(false);
      setShowDeclineMsg(false);
    }
  }

  return (
    <div className={`bg-card border rounded-2xl p-4 ${isPending ? "border-amber-200 shadow-sm" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-foreground text-sm">{app.truck?.name ?? "No truck registered"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{app.vendor?.name}</p>
          <p className="text-xs text-muted-foreground">{app.vendor?.email}</p>
          {app.truck?.cuisine && (
            <p className="text-xs text-muted-foreground capitalize mt-0.5">Cuisine: {app.truck.cuisine}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {app.notes && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mb-3 italic leading-relaxed">"{app.notes}"</p>
      )}

      {app.confirmedAt && (
        <p className="text-xs text-emerald-600 mb-2">
          Confirmed on {new Date(app.confirmedAt).toLocaleDateString()}
        </p>
      )}

      {isPending && (
        <div className="space-y-2 pt-1">
          {showDeclineMsg && (
            <textarea
              value={declineMessage}
              onChange={e => setDeclineMessage(e.target.value)}
              placeholder="Optional reason for declining…"
              rows={2}
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus("confirmed")}
              disabled={updating}
              className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Confirm
            </button>
            <button
              onClick={() => updateStatus("waitlisted")}
              disabled={updating}
              className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold hover:bg-blue-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
            >
              <ListOrdered className="w-3.5 h-3.5" /> Waitlist
            </button>
            <button
              onClick={() => showDeclineMsg ? updateStatus("declined", declineMessage) : setShowDeclineMsg(true)}
              disabled={updating}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
            >
              <ThumbsDown className="w-3.5 h-3.5" /> {showDeclineMsg ? "Send Decline" : "Decline"}
            </button>
          </div>
          {showDeclineMsg && (
            <button
              onClick={() => { setShowDeclineMsg(false); setDeclineMessage(""); }}
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {app.hostMessage && !isPending && (
        <p className="text-xs text-muted-foreground mt-2 bg-muted/40 rounded-lg p-2">
          Your message: {app.hostMessage}
        </p>
      )}
    </div>
  );
}

function ListingCard({ listing, onDelete }: { listing: any; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  async function loadApplications(force = false) {
    if (applications.length > 0 && !force) { setExpanded(v => !v); return; }
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
  const pendingCount = applications.filter(a => a.status === "pending_host_approval").length;
  const confirmedCount = applications.filter(a => a.status === "confirmed").length;

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

        {/* Stats row */}
        {applications.length > 0 && (
          <div className="flex gap-3 mb-3">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1 font-semibold border border-amber-200">
                <AlertCircle className="w-3 h-3" /> {pendingCount} pending
              </span>
            )}
            {confirmedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 font-semibold border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> {confirmedCount} confirmed
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Link href={`/spots/${listing.id}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Eye className="w-3 h-3" /> View listing
            </button>
          </Link>
          <button
            onClick={() => loadApplications()}
            disabled={loadingApps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Users className="w-3 h-3" />
            Requests {pendingCount > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-bold">{pendingCount}</span>}
            {loadingApps && <span>…</span>}
          </button>
          <button
            onClick={() => onDelete(listing.id)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-foreground">
              Spot Requests ({applications.length})
            </h4>
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
          ) : (
            <div className="space-y-3 mb-4">
              {applications.map(app => (
                <ApplicationRow key={app.id} app={app} listingId={listing.id} onUpdate={() => loadApplications(true)} />
              ))}
            </div>
          )}
          {waitlist.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> External Waitlist ({waitlist.length})
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
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Host Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your spot listings and review vendor requests.</p>
          </div>
          <Link href="/spots/new">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> List a Spot
            </button>
          </Link>
        </div>

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

        {listings.length > 0 && (
          <div className="mt-10 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-3xl p-6">
            <h3 className="font-bold text-foreground mb-2">How requests work</h3>
            <p className="text-muted-foreground text-sm">
              When a vendor submits a spot request, you'll see it here with <span className="text-amber-700 font-semibold">Pending Review</span> status.
              Confirm it to send both parties each other's contact details. Decline or waitlist as needed.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
