import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, BookOpen, Calendar, CalendarCheck, Wifi, WifiOff, Plus } from "lucide-react";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks, isLoading } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

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
