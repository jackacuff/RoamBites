import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, BookOpen, Calendar, CalendarCheck, Wifi, WifiOff, Plus, ClipboardList, Mail, Phone, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { getApiUrl, authHeaders } from "@/lib/api";
import { format } from "date-fns";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(true);

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  useEffect(() => {
    fetch(getApiUrl("/api/vendor/reservations"), { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReservations(data); })
      .catch(() => {})
      .finally(() => setResLoading(false));
  }, []);

  const checkInMutation = useCheckInTruck();
  const checkOutMutation = useCheckOutTruck();

  const handleCheckIn = async () => {
    if (!myTruck) return;
    try {
      await checkInMutation.mutateAsync({ id: myTruck.id, data: {} });
      toast({ title: "You're live! Customers can see you now." });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCheckOut = async () => {
    if (!myTruck) return;
    try {
      await checkOutMutation.mutateAsync({ id: myTruck.id });
      toast({ title: "Checked out. See you next time!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Vendor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your food truck business</p>
        </div>

        {!myTruck ? (
          <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
            <Truck className="w-16 h-16 mx-auto text-muted-foreground opacity-40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Truck Profile Yet</h2>
            <p className="text-muted-foreground mb-6">Create your truck profile to start listing your truck and managing your menu and schedule.</p>
            <Link href="/vendor/truck">
              <button className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90">
                <Plus className="w-5 h-5" />
                Create Truck Profile
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Status Banner */}
            <div className={`mb-6 p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${myTruck.isLive ? 'bg-green-50 border-green-200' : 'bg-card border-card-border'}`}>
              <div className="flex items-center gap-3">
                {myTruck.isLive ? (
                  <div className="flex items-center gap-2">
                    <Wifi className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-bold text-green-800">You're Live!</p>
                      {myTruck.currentLocation && <p className="text-sm text-green-700">At: {myTruck.currentLocation}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-foreground">Currently Offline</p>
                      <p className="text-sm text-muted-foreground">Check in to broadcast your live location</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {myTruck.isLive ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={checkOutMutation.isPending}
                    className="px-5 py-2.5 bg-white border border-green-300 text-green-800 rounded-xl font-semibold hover:bg-green-50 disabled:opacity-50"
                  >
                    {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                  </button>
                ) : (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 shadow-sm"
                  >
                    {checkInMutation.isPending ? "Checking in..." : "Go Live Now"}
                  </button>
                )}
              </div>
            </div>

            {/* Approval notice */}
            {!myTruck.isApproved && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Your truck is pending admin approval. It won't appear publicly until approved.
              </div>
            )}

            {/* Nav Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NavCard
                href="/vendor/truck"
                icon={<Truck className="w-6 h-6" />}
                title="Truck Profile"
                description="Edit your truck name, cuisine, and description"
              />
              <NavCard
                href="/vendor/menu"
                icon={<BookOpen className="w-6 h-6" />}
                title="Menu"
                description={`${myTruck.menuItemCount ?? 0} items · Add and manage your menu`}
              />
              <NavCard
                href="/vendor/schedule"
                icon={<Calendar className="w-6 h-6" />}
                title="Schedule"
                description="Manage your upcoming stops and locations"
              />
              <NavCard
                href="/vendor/events"
                icon={<CalendarCheck className="w-6 h-6" />}
                title="Event Invitations"
                description="View and respond to event invites"
              />
            </div>

            {/* Booking Requests */}
            <div className="mt-8">
              <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Booking Requests
                {reservations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{reservations.length}</span>
                )}
              </h2>
              {resLoading ? (
                <div className="p-6 bg-muted rounded-2xl text-center text-muted-foreground text-sm">Loading...</div>
              ) : reservations.length === 0 ? (
                <div className="p-6 bg-muted/40 rounded-2xl border border-dashed border-border text-center text-muted-foreground text-sm">
                  No booking requests yet. Enable reservations in your Truck Profile to start receiving them.
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map(r => (
                    <div key={r.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-foreground text-lg">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.truckName}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold whitespace-nowrap">
                          {r.eventDate}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{r.email}</span>
                        {r.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{r.phone}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.eventLocation}</span>
                      </div>
                      <p className="text-sm text-foreground bg-muted/50 rounded-xl p-3">{r.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">Received {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{myTruck.menuItemCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Menu Items</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                  {myTruck.isApproved ? "✓" : "⏳"}
                </p>
                <p className="text-sm text-muted-foreground">{myTruck.isApproved ? "Approved" : "Pending"}</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${myTruck.isLive ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {myTruck.isLive ? "Live" : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function NavCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href}>
      <div className="bg-card border border-card-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}
