import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  MapPin, Clock, CheckCircle, X, ListOrdered, Send,
  ChevronRight, Inbox,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_host_approval: {
    label: "Pending Review",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  declined: {
    label: "Declined",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <X className="w-3.5 h-3.5" />,
  },
  waitlisted: {
    label: "Waitlisted",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <ListOrdered className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <X className="w-3.5 h-3.5" />,
  },
};

const SPOT_TYPE_LABELS: Record<string, string> = {
  truck_park: "Truck Park",
  single_spot: "Single Spot",
  recurring_host: "Recurring Host",
  popup_opportunity: "Pop-Up",
};

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

export default function VendorSpotRequests() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending_host_approval" | "confirmed" | "declined">("all");

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    fetch(getApiUrl("/api/vendor/spot-applications"), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRequests(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const pendingCount = requests.filter(r => r.status === "pending_host_approval").length;
  const confirmedCount = requests.filter(r => r.status === "confirmed").length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-foreground">My Spot Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all spot requests you've submitted to hosts.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-foreground">{requests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total requests</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600 mt-1">Awaiting review</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-700">{confirmedCount}</p>
            <p className="text-xs text-emerald-600 mt-1">Confirmed</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { key: "all", label: "All" },
            { key: "pending_host_approval", label: "Pending" },
            { key: "confirmed", label: "Confirmed" },
            { key: "declined", label: "Declined" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {filter === "all" ? "No requests yet" : `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} requests`}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              {filter === "all"
                ? "Browse the marketplace and request spots for your food truck."
                : "Try a different filter to see other requests."}
            </p>
            {filter === "all" && (
              <Link href="/spots">
                <button className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto">
                  <Send className="w-4 h-4" /> Browse Spot Marketplace
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const cfg = STATUS_CONFIG[req.status] ?? { label: req.status, color: "bg-muted text-muted-foreground border-border", icon: null };
              return (
                <div key={req.id} className={`bg-card border rounded-2xl p-5 ${req.status === "confirmed" ? "border-emerald-200" : req.status === "pending_host_approval" ? "border-amber-200" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                          {SPOT_TYPE_LABELS[req.listing?.spotType] ?? req.listing?.spotType ?? "Spot"}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground truncate">{req.listing?.title ?? "Unknown listing"}</h3>
                      {(req.listing?.address || req.listing?.city) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {req.listing.address ? `${req.listing.address}, ${req.listing.city}` : req.listing.city}
                        </p>
                      )}
                      {req.listing?.hostName && (
                        <p className="text-xs text-muted-foreground mt-0.5">Hosted by {req.listing.hostName}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {req.listing?.priceInCents !== undefined && (
                        <span className="text-sm font-bold text-primary">
                          {formatPrice(req.listing.priceInCents)}{req.listing.priceInCents > 0 ? "/spot" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-xl p-2.5 italic leading-relaxed">
                      Your note: "{req.notes}"
                    </p>
                  )}

                  {req.hostMessage && (
                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Host message:</p>
                      <p className="text-xs text-blue-700 leading-relaxed">{req.hostMessage}</p>
                    </div>
                  )}

                  {req.status === "confirmed" && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Your spot is confirmed!
                      </p>
                      <p className="text-xs text-emerald-700">Check your inbox for host contact details and coordination info.</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                      {req.confirmedAt && ` · Confirmed ${new Date(req.confirmedAt).toLocaleDateString()}`}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/spots/${req.listingId}`}>
                        <button className="text-xs text-primary hover:underline">View spot</button>
                      </Link>
                      <Link href="/inbox">
                        <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                          Messages <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
