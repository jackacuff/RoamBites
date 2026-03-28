import { Layout } from "@/components/Layout";
import {
  useAdminListTrucks,
  useAdminApproveTruck,
  useAdminListUsers,
  useAdminUpdateUserStatus,
  useAdminGetStats,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Users, Truck, Activity, CheckCircle, Package,
  CreditCard, Plus, Edit2, Gift, Ban, TrendingUp, Clock, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Plan = {
  id: number; name: string; description: string | null; monthlyPrice: number;
  trialDays: number; features: string[]; isActive: boolean;
  stripePriceId: string | null; createdAt: string;
};

type Subscription = {
  id: number; status: string; trialEndsAt: string | null;
  currentPeriodEnd: string | null; stripeSubscriptionId: string | null;
  canceledAt: string | null; createdAt: string;
  vendorUserId: number; vendorName: string; vendorEmail: string;
  planId: number; planName: string; monthlyPrice: number;
  trialDaysLeft: number | null;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    past_due: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    canceled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    free: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {status === "past_due" ? "Past Due" : status}
    </span>
  );
}

function StatCard({
  label, value, icon, color = "default",
}: { label: string; value: number | undefined; icon: React.ReactNode; color?: string }) {
  const bg: Record<string, string> = {
    default: "bg-card border-border",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800",
    green: "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800",
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800",
    red: "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800",
  };
  const iconColor: Record<string, string> = {
    default: "text-primary", amber: "text-amber-600", green: "text-green-600",
    blue: "text-blue-600", red: "text-red-600",
  };
  return (
    <div className={`p-6 rounded-2xl border shadow-sm ${bg[color]}`}>
      <div className={`mb-3 ${iconColor[color]}`}>{icon}</div>
      <p className="text-3xl font-bold mb-1">{value ?? "—"}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const BLANK_PLAN = { name: "", description: "", monthlyPrice: "29.99", trialDays: "90", stripePriceId: "", featuresText: "" };

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"stats" | "trucks" | "users" | "plans" | "subscriptions">("stats");

  const { data: stats } = useAdminGetStats();
  const { data: trucks } = useAdminListTrucks();
  const { data: users } = useAdminListUsers();

  const { data: plans, refetch: refetchPlans } = useQuery<Plan[]>({
    queryKey: ["/api/admin/plans"],
    queryFn: () => fetch(getApiUrl("/api/admin/plans"), { headers: authHeaders() }).then(r => r.json()),
  });

  const { data: subscriptions, refetch: refetchSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: () => fetch(getApiUrl("/api/admin/subscriptions"), { headers: authHeaders() }).then(r => r.json()),
  });

  const approveMutation = useAdminApproveTruck({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin"] }) },
  });
  const statusMutation = useAdminUpdateUserStatus({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin"] }) },
  });

  /* ─── Plan form ─── */
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState(BLANK_PLAN);

  function openNewPlan() {
    setPlanForm(BLANK_PLAN);
    setEditingPlan(null);
    setShowPlanForm(true);
  }

  function openEditPlan(plan: Plan) {
    setPlanForm({
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: String(plan.monthlyPrice),
      trialDays: String(plan.trialDays),
      stripePriceId: plan.stripePriceId ?? "",
      featuresText: (plan.features ?? []).join("\n"),
    });
    setEditingPlan(plan);
    setShowPlanForm(true);
  }

  async function savePlan() {
    if (!planForm.name.trim()) { toast({ title: "Plan name required", variant: "destructive" }); return; }
    const body = {
      name: planForm.name,
      description: planForm.description || null,
      monthlyPrice: parseFloat(planForm.monthlyPrice),
      trialDays: parseInt(planForm.trialDays),
      stripePriceId: planForm.stripePriceId || null,
      features: planForm.featuresText.split("\n").map(s => s.trim()).filter(Boolean),
    };
    const url = editingPlan
      ? getApiUrl(`/api/admin/plans/${editingPlan.id}`)
      : getApiUrl("/api/admin/plans");
    const method = editingPlan ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { toast({ title: "Failed to save plan", variant: "destructive" }); return; }
    toast({ title: editingPlan ? "Plan updated" : "Plan created" });
    setShowPlanForm(false);
    setEditingPlan(null);
    refetchPlans();
  }

  async function togglePlanActive(plan: Plan) {
    await fetch(getApiUrl(`/api/admin/plans/${plan.id}`), {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    refetchPlans();
  }

  /* ─── Grant trial modal ─── */
  const [grantModal, setGrantModal] = useState<Subscription | null>(null);
  const [grantDays, setGrantDays] = useState("30");

  async function grantTrial() {
    if (!grantModal) return;
    const r = await fetch(getApiUrl(`/api/admin/subscriptions/${grantModal.id}/grant-trial`), {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ days: parseInt(grantDays) }),
    });
    if (!r.ok) { toast({ title: "Failed to grant trial", variant: "destructive" }); return; }
    toast({ title: `Granted ${grantDays} additional trial days to ${grantModal.vendorName}` });
    setGrantModal(null);
    refetchSubs();
  }

  async function cancelSub(sub: Subscription) {
    if (!confirm(`Cancel subscription for ${sub.vendorName}? This cannot be undone.`)) return;
    const r = await fetch(getApiUrl(`/api/admin/subscriptions/${sub.id}/cancel`), {
      method: "POST",
      headers: authHeaders(),
    });
    if (!r.ok) { toast({ title: "Failed to cancel", variant: "destructive" }); return; }
    toast({ title: `Subscription canceled for ${sub.vendorName}` });
    refetchSubs();
  }

  const tabs = [
    { id: "stats", label: "Overview", icon: Activity },
    { id: "trucks", label: "Trucks", icon: Truck },
    { id: "users", label: "Users", icon: Users },
    { id: "plans", label: "Plans", icon: Package },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  ] as const;

  return (
    <Layout>
      {/* Header + tab bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-6">Platform Administration</h1>
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all gap-2 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Overview ── */}
        {activeTab === "stats" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Platform Metrics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats?.totalUsers} icon={<Users className="w-5 h-5" />} />
                <StatCard label="Total Trucks" value={stats?.totalTrucks} icon={<Truck className="w-5 h-5" />} />
                <StatCard label="Pending Approval" value={(stats as any)?.pendingApproval} icon={<Clock className="w-5 h-5" />} color="amber" />
                <StatCard label="Total Events" value={(stats as any)?.totalEvents} icon={<Activity className="w-5 h-5" />} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Subscription Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="On Free Trial" value={(stats as any)?.trialing ?? 0} icon={<Gift className="w-5 h-5" />} color="blue" />
                <StatCard label="Active Subscribers" value={(stats as any)?.activeSubscriptions ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="green" />
                <StatCard label="Past Due" value={(stats as any)?.pastDue ?? 0} icon={<AlertCircle className="w-5 h-5" />} color="red" />
              </div>
            </div>
          </div>
        )}

        {/* ── Trucks ── */}
        {activeTab === "trucks" && (
          <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Truck</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Vendor</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {trucks?.map(truck => (
                  <tr key={truck.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{truck.name}</td>
                    <td className="p-4 text-muted-foreground text-sm">{truck.vendorName || `User #${truck.vendorUserId}`}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${truck.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {truck.isApproved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => approveMutation.mutate({ id: truck.id, data: { isApproved: !truck.isApproved } })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${truck.isApproved ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                      >
                        {truck.isApproved ? "Revoke" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Name</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Email</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Role</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="p-4 text-sm font-semibold text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4 text-muted-foreground text-sm">{u.email}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground capitalize">{u.role}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => statusMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${u.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                      >
                        {u.isActive ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Plans ── */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Subscription Plans</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage pricing, trial lengths, and feature lists</p>
              </div>
              <button
                onClick={openNewPlan}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New Plan
              </button>
            </div>

            {showPlanForm && (
              <div className="bg-card border border-primary/30 rounded-2xl p-6 shadow-md">
                <h3 className="font-semibold text-lg mb-4">{editingPlan ? `Edit: ${editingPlan.name}` : "Create New Plan"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Plan Name *</label>
                    <input
                      value={planForm.name}
                      onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Vendor Pro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Price ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={planForm.monthlyPrice}
                      onChange={e => setPlanForm(f => ({ ...f, monthlyPrice: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Free Trial Days</label>
                    <input
                      type="number" min="0"
                      value={planForm.trialDays}
                      onChange={e => setPlanForm(f => ({ ...f, trialDays: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Stripe Price ID
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      value={planForm.stripePriceId}
                      onChange={e => setPlanForm(f => ({ ...f, stripePriceId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="price_..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      value={planForm.description}
                      onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Features <span className="text-muted-foreground font-normal">(one per line)</span></label>
                    <textarea
                      rows={5}
                      value={planForm.featuresText}
                      onChange={e => setPlanForm(f => ({ ...f, featuresText: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder={"Unlimited menu items\nLive GPS check-in\nSchedule management\nEvent marketplace access"}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={savePlan}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    {editingPlan ? "Save Changes" : "Create Plan"}
                  </button>
                  <button
                    onClick={() => { setShowPlanForm(false); setEditingPlan(null); }}
                    className="px-5 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plans?.map(plan => (
                <div
                  key={plan.id}
                  className={`bg-card border rounded-2xl p-6 shadow-sm transition-opacity ${plan.isActive ? "border-border" : "border-border/40 opacity-60"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${plan.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => openEditPlan(plan)} title="Edit plan" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => togglePlanActive(plan)} title={plan.isActive ? "Deactivate" : "Activate"} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                        {plan.isActive
                          ? <Ban className="w-4 h-4 text-red-500" />
                          : <CheckCircle className="w-4 h-4 text-green-600" />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-8 mb-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">${Number(plan.monthlyPrice).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{plan.trialDays}</p>
                      <p className="text-xs text-muted-foreground">day free trial</p>
                    </div>
                  </div>

                  {plan.features?.length > 0 && (
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {plan.stripePriceId && (
                    <p className="mt-2 text-xs font-mono text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 truncate">
                      {plan.stripePriceId}
                    </p>
                  )}
                </div>
              ))}
              {(!plans || plans.length === 0) && !showPlanForm && (
                <div className="md:col-span-2 text-center py-16 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No plans yet. Create your first plan to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Subscriptions ── */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Vendor Subscriptions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{subscriptions?.length ?? 0} vendors enrolled</p>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-4 text-sm font-semibold text-muted-foreground">Vendor</th>
                    <th className="p-4 text-sm font-semibold text-muted-foreground">Plan</th>
                    <th className="p-4 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 text-sm font-semibold text-muted-foreground">Trial / Period</th>
                    <th className="p-4 text-sm font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions?.map(sub => (
                    <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <p className="font-medium">{sub.vendorName}</p>
                        <p className="text-xs text-muted-foreground">{sub.vendorEmail}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{sub.planName}</p>
                        <p className="text-xs text-muted-foreground">${Number(sub.monthlyPrice).toFixed(2)}/mo</p>
                      </td>
                      <td className="p-4"><StatusBadge status={sub.status} /></td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {sub.status === "trialing" && sub.trialDaysLeft !== null && (
                          <span className={`font-semibold ${sub.trialDaysLeft <= 14 ? "text-amber-600" : "text-foreground"}`}>
                            {sub.trialDaysLeft}d remaining
                          </span>
                        )}
                        {sub.status === "trialing" && sub.trialEndsAt && (
                          <span className="block text-xs">ends {format(new Date(sub.trialEndsAt), "MMM d, yyyy")}</span>
                        )}
                        {sub.status === "active" && sub.currentPeriodEnd && (
                          <span>Renews {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}</span>
                        )}
                        {sub.status === "canceled" && sub.canceledAt && (
                          <span>Canceled {format(new Date(sub.canceledAt), "MMM d, yyyy")}</span>
                        )}
                        {sub.status === "past_due" && <span className="text-red-600 font-medium">Payment overdue</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setGrantModal(sub); setGrantDays("30"); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Gift className="w-3 h-3" />
                            Grant Trial
                          </button>
                          {sub.status !== "canceled" && (
                            <button
                              onClick={() => cancelSub(sub)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Ban className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!subscriptions || subscriptions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No vendor subscriptions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Grant Trial Modal ── */}
      {grantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Grant Free Trial</h3>
                <p className="text-xs text-muted-foreground">{grantModal.vendorName}</p>
              </div>
            </div>
            <label className="block text-sm font-medium mb-2">Additional days to grant</label>
            <input
              type="number" min="1" max="365"
              value={grantDays}
              onChange={e => setGrantDays(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex gap-3">
              <button
                onClick={grantTrial}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Grant {grantDays} Days
              </button>
              <button
                onClick={() => setGrantModal(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
