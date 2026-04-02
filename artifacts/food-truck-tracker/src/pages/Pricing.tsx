import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl, authHeaders } from "@/lib/api";
import { Check, Zap, Star, Crown, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  trialDays: number;
  features: string[];
  stripePriceId: string | null;
  isRecommended?: boolean;
}

const VENDOR_SELLING_POINTS = [
  "Get discovered by customers searching near you",
  "Real-time GPS location sharing keeps customers finding you",
  "Post daily specials and schedule updates in seconds",
  "Book events, connect with organizers, fill your calendar",
  "Full analytics on views, favorites, and bookings",
  "Social sharing tools to grow your audience",
];

const ORGANIZER_SELLING_POINTS = [
  "Create events and fill spots with the right trucks",
  "Built-in marketplace — trucks apply directly to you",
  "Stripe Connect payments — collect spot fees instantly",
  "Manage invitations, applications, and reservations in one place",
  "Event pages shared across the RoamBites community",
  "Communicate with vendors right in the platform",
];

const ICONS = [Zap, Star, Crown];

function PlanCard({ plan, index, isCurrentPlan, onSubscribe, loading }: {
  plan: Plan; index: number;
  isCurrentPlan: boolean;
  onSubscribe: (plan: Plan) => void;
  loading: boolean;
}) {
  const Icon = ICONS[index % ICONS.length];
  const isPopular = plan.isRecommended ?? index === 0;

  return (
    <div className={`relative bg-card rounded-3xl border p-8 flex flex-col transition-all hover:shadow-xl ${
      isPopular ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/30"
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
            Most Popular
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPopular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-display font-bold text-foreground">${plan.monthlyPrice.toFixed(0)}</span>
          <span className="text-muted-foreground mb-1">/mo</span>
        </div>
        {plan.trialDays > 0 && (
          <p className="text-sm text-green-600 font-medium mt-1">
            {plan.trialDays}-day free trial included
          </p>
        )}
      </div>

      {plan.features && plan.features.length > 0 && (
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {isCurrentPlan ? (
        <div className="w-full py-3 rounded-xl bg-green-50 border border-green-200 text-center text-green-700 text-sm font-semibold">
          ✓ Your current plan
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          disabled={loading}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isPopular
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
              : "bg-muted text-foreground hover:bg-muted/70 border border-border"
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get started <ChevronRight className="w-4 h-4" /></>}
        </button>
      )}
    </div>
  );
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [currentSub, setCurrentSub] = useState<{ planId: number; status: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"vendor" | "organizer">("vendor");

  useEffect(() => {
    fetch(getApiUrl("/api/plans"))
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "vendor") return;
    fetch(getApiUrl("/api/vendor/subscription"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (data?.planId) setCurrentSub({ planId: data.planId, status: data.status }); })
      .catch(() => {});
  }, [isAuthenticated, user]);

  async function handleSubscribe(plan: Plan) {
    if (!isAuthenticated) {
      window.location.href = "/signup?role=vendor";
      return;
    }
    if (!plan.stripePriceId) {
      toast({ title: "Coming soon", description: "This plan isn't connected to billing yet. Contact us to get set up.", variant: "destructive" });
      return;
    }
    setSubscribing(true);
    try {
      const r = await fetch(getApiUrl("/api/vendor/subscription/subscribe"), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ successUrl: window.location.origin + "/vendor/dashboard?subscribed=1", cancelUrl: window.location.href }),
      });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: data.error || "Failed to start checkout", variant: "destructive" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Star className="w-4 h-4" /> Flexible plans for every stage
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4">
            Grow your food truck business
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of food trucks using RoamBites to get more bookings, fill events, and build a loyal following — starting with a free trial.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Tab toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab("vendor")}
              className={`px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === "vendor" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              🚛 Vendor Plans
            </button>
            <button
              onClick={() => setActiveTab("organizer")}
              className={`px-6 py-2.5 text-sm font-medium transition-colors ${activeTab === "organizer" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              🎪 Organizer Plans
            </button>
          </div>
        </div>

        {activeTab === "vendor" && (
          <>
            {loadingPlans ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1, 2].map(i => <div key={i} className="h-96 rounded-3xl bg-muted animate-pulse" />)}
              </div>
            ) : plans.length > 0 ? (
              <div className={`grid gap-6 ${plans.length === 1 ? "max-w-sm mx-auto" : "sm:grid-cols-2"}`}>
                {plans.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    index={i}
                    isCurrentPlan={currentSub?.planId === plan.id}
                    onSubscribe={handleSubscribe}
                    loading={subscribing}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No plans available right now.</div>
            )}

            <div className="mt-16 bg-muted/40 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6 text-center">Everything included in every plan</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {VENDOR_SELLING_POINTS.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-sm text-foreground">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "organizer" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Event Organizer</h2>
                <p className="text-muted-foreground mt-2">Create events, fill spots, and get paid — all in one platform</p>
              </div>

              <div className="mb-8 text-center">
                <div className="flex items-end gap-1 justify-center">
                  <span className="text-4xl font-display font-bold text-foreground">Free</span>
                  <span className="text-muted-foreground mb-1">to start</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  No monthly fee. Platform takes a small processing fee on spot payments.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {ORGANIZER_SELLING_POINTS.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {pt}
                  </li>
                ))}
              </ul>

              {isAuthenticated && user?.role === "organizer" ? (
                <Link href="/organizer">
                  <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">
                    Go to Organizer Dashboard →
                  </button>
                </Link>
              ) : (
                <Link href="/signup?role=organizer">
                  <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
                    Get started free <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">Questions?</h3>
          <p className="text-muted-foreground text-sm">
            All plans include a free trial. Cancel anytime. No hidden fees.
            {" "}<a href="mailto:hello@roambites.com" className="text-primary hover:underline">Contact us</a> if you need help choosing.
          </p>
        </div>
      </div>
    </Layout>
  );
}
