import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { Loader2, Shield, Users, UserCheck, UserX, LogIn, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700 border border-purple-200",
  admin: "bg-blue-100 text-blue-700 border border-blue-200",
  vendor: "bg-orange-100 text-orange-700 border border-orange-200",
  organizer: "bg-green-100 text-green-700 border border-green-200",
  customer: "bg-gray-100 text-gray-700 border border-gray-200",
};

export default function SuperAdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (user && user.role !== "superadmin") { navigate("/"); return; }
  }, [isAuthenticated, user]);

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch(getApiUrl("/api/superadmin/users"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { if (user?.role === "superadmin") load(); }, [user]);

  const handleImpersonate = async (target: UserRow) => {
    setImpersonating(target.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/superadmin/impersonate/${target.id}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Impersonation failed", description: err.error, variant: "destructive" });
        return;
      }
      const data = await res.json();

      const originalToken = token!;
      localStorage.setItem("token_original", originalToken);
      localStorage.setItem("token", data.token);
      localStorage.setItem("impersonated_user", JSON.stringify({
        name: data.targetUser.name,
        email: data.targetUser.email,
        role: data.targetUser.role,
        superAdminName: data.superAdmin.name,
      }));

      queryClient.clear();
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setImpersonating(null);
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.role.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    byRole: users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {} as Record<string, number>),
  };

  if (!user || user.role !== "superadmin") {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-purple-950 to-purple-900 border-b border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-800/60">
              <Crown className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">SuperAdmin Console</h1>
              <p className="text-purple-300 text-sm">Full platform control · Impersonation enabled</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Total Users</p>
            <p className="text-3xl font-bold font-display">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-3xl font-bold font-display text-green-600">{stats.active}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Vendors</p>
            <p className="text-3xl font-bold font-display text-orange-500">{stats.byRole.vendor ?? 0}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Customers</p>
            <p className="text-3xl font-bold font-display">{stats.byRole.customer ?? 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            All Users
          </h2>
          <input
            type="text"
            placeholder="Filter by name, email, or role…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-64 focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-4 font-semibold text-muted-foreground">Name</th>
                    <th className="p-4 font-semibold text-muted-foreground">Email</th>
                    <th className="p-4 font-semibold text-muted-foreground">Role</th>
                    <th className="p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="p-4 font-semibold text-muted-foreground text-right">Impersonate</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-2">
                          {u.role === "superadmin" && <Crown className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          {u.name}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${ROLE_COLORS[u.role] ?? ROLE_COLORS.customer}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <UserCheck className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <UserX className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {u.role === "superadmin" ? (
                          <span className="text-xs text-muted-foreground italic">N/A</span>
                        ) : !u.isActive ? (
                          <span className="text-xs text-muted-foreground italic">Disabled</span>
                        ) : (
                          <button
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonating === u.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {impersonating === u.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LogIn className="w-3 h-3" />
                            )}
                            Log in as
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                        No users match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
