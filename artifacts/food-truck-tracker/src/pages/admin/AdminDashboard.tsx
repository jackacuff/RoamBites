import { Layout } from "@/components/Layout";
import { useAdminListTrucks, useAdminApproveTruck, useAdminListUsers, useAdminUpdateUserStatus, useAdminGetStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Truck, Activity, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'stats' | 'trucks' | 'users'>('stats');

  const { data: stats } = useAdminGetStats();
  const { data: trucks } = useAdminListTrucks();
  const { data: users } = useAdminListUsers();

  const approveMutation = useAdminApproveTruck({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin"] }) }
  });
  
  const statusMutation = useAdminUpdateUserStatus({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin"] }) }
  });

  return (
    <Layout>
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-6">Platform Administration</h1>
          <div className="flex gap-2">
            {[
              { id: 'stats', label: 'Overview', icon: Activity },
              { id: 'trucks', label: 'Manage Trucks', icon: Truck },
              { id: 'users', label: 'Manage Users', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Users</p>
              <p className="text-4xl font-display font-bold">{stats.totalUsers}</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Trucks</p>
              <p className="text-4xl font-display font-bold">{stats.totalTrucks}</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 shadow-sm">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-500 mb-2">Pending Approvals</p>
              <p className="text-4xl font-display font-bold text-amber-600 dark:text-amber-400">{stats.pendingApproval}</p>
            </div>
          </div>
        )}

        {activeTab === 'trucks' && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Truck Name</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Vendor</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Status</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks?.map(truck => (
                  <tr key={truck.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{truck.name}</td>
                    <td className="p-4 text-muted-foreground">{truck.vendorName || `User #${truck.vendorUserId}`}</td>
                    <td className="p-4">
                      {truck.isApproved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Approved</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => approveMutation.mutate({ id: truck.id, data: { isApproved: !truck.isApproved }})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${truck.isApproved ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      >
                        {truck.isApproved ? 'Revoke' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Name</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Email</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Role</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{u.name}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-muted text-xs font-medium uppercase">{u.role}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => statusMutation.mutate({ id: u.id, data: { isActive: !u.isActive }})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${u.isActive ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
