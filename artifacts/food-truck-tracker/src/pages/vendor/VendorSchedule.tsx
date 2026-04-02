import { useState, useMemo, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListTrucks, useListSchedules, useCreateScheduleEntry, useSetScheduleLive, useCheckInTruck, useCheckOutTruck } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Wifi, WifiOff, MapPin, Calendar, X, Star, ChevronDown, ChevronUp, Copy } from "lucide-react";

import { format, addWeeks } from "date-fns";

const CheckInMapModal = lazy(() =>
  import("@/components/CheckInMapModal").then((m) => ({ default: m.CheckInMapModal }))
);

interface DayRow {
  id: string;
  startDateTime: string;
  endDateTime: string;
}

interface LocationForm {
  venueName: string;
  address: string;
  city: string;
  notes: string;
}

function makeId() { return Math.random().toString(36).slice(2); }

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDayRow(base?: { start: string; end: string }): DayRow {
  if (base) {
    return { id: makeId(), startDateTime: base.start, endDateTime: base.end };
  }
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const end = new Date(now);
  end.setHours(end.getHours() + 4);
  return { id: makeId(), startDateTime: toLocalDatetimeString(now), endDateTime: toLocalDatetimeString(end) };
}

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
  const [showSpots, setShowSpots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

  const [location, setLocation] = useState<LocationForm>({ venueName: "", address: "", city: "", notes: "" });
  const [days, setDays] = useState<DayRow[]>([defaultDayRow()]);

  const invalidateTrucks = () => queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });

  // Derive frequent spots from all past schedule entries, sorted by usage count
  const frequentSpots = useMemo(() => {
    if (!schedules) return [];
    const map = new Map<string, { venueName: string; address: string; city: string; count: number }>();
    for (const s of schedules) {
      const key = s.venueName.toLowerCase().trim();
      if (map.has(key)) {
        map.get(key)!.count++;
      } else {
        map.set(key, { venueName: s.venueName, address: s.address ?? "", city: s.city, count: 1 });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [schedules]);

  const fillFromSpot = (spot: { venueName: string; address: string; city: string }) => {
    setLocation(l => ({ ...l, venueName: spot.venueName, address: spot.address, city: spot.city }));
  };

  const addDay = () => {
    const last = days[days.length - 1];
    if (last) {
      // Default the new day to tomorrow at same time
      const start = new Date(last.startDateTime);
      const end = new Date(last.endDateTime);
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
      setDays(d => [...d, { id: makeId(), startDateTime: toLocalDatetimeString(start), endDateTime: toLocalDatetimeString(end) }]);
    } else {
      setDays(d => [...d, defaultDayRow()]);
    }
  };

  const addNextWeek = () => {
    const first = days[0];
    if (!first) return;
    const start = addWeeks(new Date(first.startDateTime), 1);
    const end = addWeeks(new Date(first.endDateTime), 1);
    setDays(d => [...d, { id: makeId(), startDateTime: toLocalDatetimeString(start), endDateTime: toLocalDatetimeString(end) }]);
  };

  const updateDay = (id: string, field: "startDateTime" | "endDateTime", value: string) => {
    setDays(d => d.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeDay = (id: string) => {
    setDays(d => d.filter(row => row.id !== id));
  };

  const resetForm = () => {
    setLocation({ venueName: "", address: "", city: "", notes: "" });
    setDays([defaultDayRow()]);
    setShowAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTruck || !location.venueName || !location.city) return;
    if (days.length === 0) { toast({ title: "Add at least one date", variant: "destructive" }); return; }

    setSubmitting(true);
    let successCount = 0;
    for (const day of days) {
      try {
        await createMutation.mutateAsync({
          data: {
            truckId: myTruck.id,
            venueName: location.venueName,
            address: location.address || null,
            city: location.city,
            startDateTime: new Date(day.startDateTime).toISOString(),
            endDateTime: new Date(day.endDateTime).toISOString(),
            notes: location.notes || null,
            isRecurring: false,
          }
        });
        successCount++;
      } catch (e: any) {
        toast({ title: `Error on entry ${successCount + 1}`, description: e.message, variant: "destructive" });
      }
    }

    setSubmitting(false);
    if (successCount > 0) {
      toast({
        title: successCount === 1 ? "Stop added!" : `${successCount} stops added!`,
        description: successCount > 1 ? `Added ${successCount} days at ${location.venueName}` : undefined,
      });
      resetForm();
      invalidateSchedules();
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

  const handleCheckIn = async (lat?: number, lng?: number) => {
    if (!myTruck) return;
    try {
      await checkInMutation.mutateAsync({
        id: myTruck.id,
        data: {
          ...(lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : {}),
        },
      });
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
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Add Stop
            </button>
          )}
        </div>

        {/* Live status banner */}
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4 ${myTruck.isLive ? 'bg-green-50 border-green-200' : 'bg-muted border-border'}`}>
          <div className="flex items-center gap-3">
            {myTruck.isLive ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
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
            <button onClick={() => setCheckInModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Wifi className="w-4 h-4" />
              Go Live
            </button>
          )}
        </div>

        {/* Add Stop Form */}
        {showAdd && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Add Stop</h2>
              <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Frequent Spots */}
            {frequentSpots.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSpots(s => !s)}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-2"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Your frequent spots
                  {showSpots ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showSpots && (
                  <div className="flex flex-wrap gap-2">
                    {frequentSpots.map(spot => (
                      <button
                        key={spot.venueName}
                        type="button"
                        onClick={() => fillFromSpot(spot)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-primary" />
                        {spot.venueName}
                        {spot.count > 1 && <span className="text-xs text-muted-foreground">×{spot.count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Location Fields */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Venue Name *</label>
                  <input
                    required
                    value={location.venueName}
                    onChange={e => setLocation(l => ({ ...l, venueName: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="Scissortail Park"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    value={location.address}
                    onChange={e => setLocation(l => ({ ...l, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="300 SW 7th St"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    required
                    value={location.city}
                    onChange={e => setLocation(l => ({ ...l, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                    placeholder="Oklahoma City"
                  />
                </div>
              </div>
            </div>

            {/* Date/Time Rows */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Date &amp; Time — {days.length} {days.length === 1 ? "day" : "days"}
              </h3>
              <div className="space-y-2">
                {days.map((day, i) => (
                  <div key={day.id} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border/60">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div className="flex flex-1 gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-muted-foreground mb-0.5">Start</label>
                        <input
                          required
                          type="datetime-local"
                          value={day.startDateTime}
                          onChange={e => updateDay(day.id, "startDateTime", e.target.value)}
                          className="w-full px-2 py-1.5 border border-input rounded-lg bg-background text-foreground text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-muted-foreground mb-0.5">End</label>
                        <input
                          required
                          type="datetime-local"
                          value={day.endDateTime}
                          onChange={e => updateDay(day.id, "endDateTime", e.target.value)}
                          className="w-full px-2 py-1.5 border border-input rounded-lg bg-background text-foreground text-sm"
                        />
                      </div>
                    </div>
                    {days.length > 1 && (
                      <button type="button" onClick={() => removeDay(day.id)} className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Day Shortcuts */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={addDay}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add next day
                </button>
                {days.length > 0 && (
                  <button
                    type="button"
                    onClick={addNextWeek}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Same time next week
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                value={location.notes}
                onChange={e => setLocation(l => ({ ...l, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                placeholder="Special event, parking info..."
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Saving..." : days.length === 1 ? "Add Stop" : `Add ${days.length} Stops`}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm hover:opacity-90">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Upcoming Stops List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : upcoming.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Stops</h2>
            <div className="space-y-3">
              {upcoming
                .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                .map(entry => {
                  const isActive = new Date(entry.startDateTime) <= now && new Date(entry.endDateTime) >= now;
                  return (
                    <div key={entry.id} className={`bg-card border rounded-xl p-4 ${isActive ? 'border-green-300 bg-green-50' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
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
                        <div className="flex items-center gap-2 flex-shrink-0">
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
