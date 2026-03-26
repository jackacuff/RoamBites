import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useListSchedules, useCreateScheduleEntry, useSetScheduleLive, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Wifi, WifiOff, Trash2, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function VendorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trucks } = useListTrucks();
  const myTruck = trucks?.find(t => t.vendorUserId === user?.id);

  const { data: schedules, isLoading } = useListSchedules(
    { truckId: myTruck?.id },
    { query: { enabled: !!myTruck } }
  );

  const createMutation = useCreateScheduleEntry();
  const setLiveMutation = useSetScheduleLive();
  const checkInMutation = useCheckInTruck();
  const checkOutMutation = useCheckOutTruck();

  const [showAdd, setShowAdd] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const invalidateTrucks = () => queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });

  const handleAdd = async (data: any) => {
    if (!myTruck) return;
    try {
      await createMutation.mutateAsync({
        data: {
          truckId: myTruck.id,
          venueName: data.venueName,
          address: data.address || null,
          city: data.city,
          startDateTime: new Date(data.startDateTime).toISOString(),
          endDateTime: new Date(data.endDateTime).toISOString(),
          notes: data.notes || null,
          isRecurring: false,
        }
      });
      toast({ title: "Schedule entry added!" });
      reset();
      setShowAdd(false);
      invalidateSchedules();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSetLive = async (id: number) => {
    try {
      await setLiveMutation.mutateAsync({ id });
      toast({ title: "Now Live at this location!" });
      invalidateSchedules();
      invalidateTrucks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCheckIn = async () => {
    if (!myTruck) return;
    try {
      await checkInMutation.mutateAsync({ id: myTruck.id, data: {} });
      toast({ title: "You're live! Customers can see you now." });
      invalidateTrucks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCheckOut = async () => {
    if (!myTruck) return;
    try {
      await checkOutMutation.mutateAsync({ id: myTruck.id });
      toast({ title: "Checked out!" });
      invalidateTrucks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!myTruck) return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Create your truck profile first.</p>
        <Link href="/vendor/truck" className="mt-4 inline-block text-primary hover:underline">Create Truck Profile →</Link>
      </div>
    </Layout>
  );

  const now = new Date();
  const upcoming = (schedules || []).filter(s => new Date(s.endDateTime) >= now);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/vendor" className="text-muted-foreground hover:text-primary text-sm">← Back to Dashboard</Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Manage Schedule</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add Stop
          </button>
        </div>

        {/* Live status banner */}
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4 ${myTruck.isLive ? 'bg-green-50 border-green-200' : 'bg-muted border-border'}`}>
          <div className="flex items-center gap-3">
            {myTruck.isLive ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className={`font-semibold ${myTruck.isLive ? 'text-green-800' : 'text-foreground'}`}>
                {myTruck.isLive ? "You're Live!" : "Not Currently Live"}
              </p>
              {myTruck.isLive && myTruck.currentLocation && (
                <p className="text-sm text-green-700">{myTruck.currentLocation}</p>
              )}
            </div>
          </div>
          {myTruck.isLive ? (
            <button onClick={handleCheckOut} disabled={checkOutMutation.isPending} className="px-4 py-2 bg-white border border-green-300 text-green-800 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50">
              Check Out
            </button>
          ) : (
            <button onClick={handleCheckIn} disabled={checkInMutation.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              Check In
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleSubmit(handleAdd)} className="bg-card border border-card-border rounded-2xl p-5 mb-6 space-y-3">
            <h2 className="font-semibold">New Schedule Entry</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Venue Name *</label>
                <input {...register("venueName", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Scissortail Park" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input {...register("address")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="300 SW 7th St" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input {...register("city", { required: true })} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Oklahoma City" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start *</label>
                <input {...register("startDateTime", { required: true })} type="datetime-local" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End *</label>
                <input {...register("endDateTime", { required: true })} type="datetime-local" className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input {...register("notes")} className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground" placeholder="Optional details..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {createMutation.isPending ? "Saving..." : "Add Entry"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:opacity-90">Cancel</button>
            </div>
          </form>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : upcoming.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Stops</h2>
            <div className="space-y-3">
              {upcoming.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()).map(entry => {
                const isActive = new Date(entry.startDateTime) <= now && new Date(entry.endDateTime) >= now;
                return (
                  <div key={entry.id} className={`bg-card border rounded-xl p-4 ${isActive ? 'border-green-300 bg-green-50' : 'border-card-border'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">{entry.venueName}</span>
                          {entry.isLive && (
                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.city}{entry.address ? ` · ${entry.address}` : ''}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(new Date(entry.startDateTime), "MMM d · h:mm a")} – {format(new Date(entry.endDateTime), "h:mm a")}</span>
                        </div>
                        {entry.notes && <p className="text-sm text-muted-foreground mt-1 italic">{entry.notes}</p>}
                      </div>
                      {isActive && !entry.isLive && (
                        <button
                          onClick={() => handleSetLive(entry.id)}
                          disabled={setLiveMutation.isPending}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          Set Live
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No upcoming stops"
            description="Add schedule entries so customers can find you."
          />
        )}
      </div>
    </Layout>
  );
}
