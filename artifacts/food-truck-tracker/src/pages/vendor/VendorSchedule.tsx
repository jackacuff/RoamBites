import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useListTrucks, useListSchedules, useCreateScheduleEntry,
  useSetScheduleLive, useCheckInTruck, useCheckOutTruck,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Wifi, WifiOff, MapPin, Calendar, X, Star, ChevronDown, ChevronUp,
  Copy, Clock, CheckCircle, ListOrdered, ChevronRight, Repeat, Zap, Inbox,
  CalendarCheck,
} from "lucide-react";
import { format, addWeeks, isToday } from "date-fns";
import { GoLiveModal, type ScheduleWindow } from "@/components/GoLiveModal";
import { getApiUrl, authHeaders } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Commitment {
  _key: string;
  kind: "spot" | "event";
  typeLabel: string;
  title: string;
  location: string;
  date?: string;
  status: string;
  isRecurring?: boolean;
  confirmedAt?: string;
  href: string;
  priceInCents?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() { return Math.random().toString(36).slice(2); }

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDayRow(base?: { start: string; end: string }): DayRow {
  if (base) return { id: makeId(), startDateTime: base.start, endDateTime: base.end };
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const end = new Date(now);
  end.setHours(end.getHours() + 4);
  return { id: makeId(), startDateTime: toLocalDatetimeString(now), endDateTime: toLocalDatetimeString(end) };
}

// ── Commitment Card ───────────────────────────────────────────────────────────

function CommitmentCard({ item }: { item: Commitment }) {
  const isConfirmed = item.status === "confirmed" || item.status === "approved";
  const isPending = item.status === "pending_host_approval" || item.status === "pending" || item.status === "waitlisted";
  const isWaitlisted = item.status === "waitlisted";

  return (
    <div className={`bg-card border rounded-2xl p-4 ${isConfirmed ? "border-emerald-200" : isPending ? "border-amber-200" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {item.kind === "spot" ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-primary">{item.typeLabel}</span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Event</span>
            )}
            {item.isRecurring && (
              <span className="text-xs font-medium flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                <Repeat className="w-3 h-3" /> Recurring
              </span>
            )}
            {isConfirmed && (
              <span className="text-xs font-semibold flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <CheckCircle className="w-3 h-3" /> Confirmed
              </span>
            )}
            {isPending && !isWaitlisted && (
              <span className="text-xs font-semibold flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
            {isWaitlisted && (
              <span className="text-xs font-semibold flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <ListOrdered className="w-3 h-3" /> Waitlisted
              </span>
            )}
          </div>

          <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" /> {item.location}
          </p>

          {item.date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 shrink-0" />
              {format(new Date(item.date), "MMM d, yyyy")}
            </p>
          )}

          {isConfirmed && item.confirmedAt && (
            <p className="text-xs text-emerald-600 mt-1">
              Confirmed {format(new Date(item.confirmedAt), "MMM d")}
            </p>
          )}
          {isConfirmed && (
            <p className="text-xs text-emerald-700 mt-1.5 bg-emerald-50 rounded-xl px-2.5 py-1.5">
              {item.kind === "spot" ? "Check inbox for host contact info." : "Check inbox for event details."}
            </p>
          )}
          {isPending && !isWaitlisted && (
            <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded-xl px-2.5 py-1.5">
              Awaiting {item.kind === "spot" ? "host" : "organizer"} decision — you'll hear back by message.
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          {item.priceInCents !== undefined && item.priceInCents > 0 && (
            <span className="text-sm font-bold text-primary">${(item.priceInCents / 100).toFixed(0)}/spot</span>
          )}
          <Link href={item.href}>
            <button className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium">
              Details <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

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
  const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
  const [commitmentView, setCommitmentView] = useState<"upcoming" | "pending">("upcoming");
  const [, setTick] = useState(0);

  const [location, setLocation] = useState<LocationForm>({ venueName: "", address: "", city: "", notes: "" });
  const [days, setDays] = useState<DayRow[]>([defaultDayRow()]);

  const [spotApps, setSpotApps] = useState<any[]>([]);
  const [eventReservations, setEventReservations] = useState<any[]>([]);
  const [loadingCommitments, setLoadingCommitments] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/vendor/spot-applications"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(getApiUrl("/api/vendor/spot-reservations"), { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ]).then(([apps, reservations]) => {
      setSpotApps(Array.isArray(apps) ? apps : []);
      setEventReservations(Array.isArray(reservations) ? reservations : []);
    }).finally(() => setLoadingCommitments(false));
  }, []);

  const confirmedCommitments = useMemo((): Commitment[] => {
    const spotConf: Commitment[] = spotApps
      .filter(a => a.status === "confirmed")
      .map(a => ({
        _key: `spot-${a.id}`,
        kind: "spot" as const,
        typeLabel: a.listing?.spotType === "truck_park" ? "Truck Park" :
                   a.listing?.spotType === "recurring_host" ? "Recurring Host" :
                   a.listing?.spotType === "popup_opportunity" ? "Pop-Up" : "Spot",
        title: a.listing?.title ?? "Spot Listing",
        location: a.listing?.address ? `${a.listing.address}, ${a.listing.city}` : (a.listing?.city ?? "Oklahoma"),
        date: undefined,
        status: a.status,
        isRecurring: a.listing?.scheduleType === "recurring",
        confirmedAt: a.confirmedAt,
        href: `/spots/${a.listingId}`,
        priceInCents: a.listing?.priceInCents,
      }));

    const evtConf: Commitment[] = eventReservations
      .filter(r => r.status === "approved")
      .map(r => ({
        _key: `event-${r.id}`,
        kind: "event" as const,
        typeLabel: "Event",
        title: r.event?.name ?? "Event",
        location: r.event?.venueName ?? r.event?.city ?? "Oklahoma",
        date: r.event?.startDateTime,
        status: r.status,
        isRecurring: false,
        href: `/events/${r.eventId}`,
        priceInCents: r.paymentAmountInCents,
      }));

    return [...evtConf.sort((a, b) => a.date && b.date ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0), ...spotConf];
  }, [spotApps, eventReservations]);

  const pendingCommitments = useMemo((): Commitment[] => {
    const spotPending: Commitment[] = spotApps
      .filter(a => a.status === "pending_host_approval" || a.status === "waitlisted")
      .map(a => ({
        _key: `spot-${a.id}`,
        kind: "spot" as const,
        typeLabel: a.listing?.spotType === "truck_park" ? "Truck Park" :
                   a.listing?.spotType === "recurring_host" ? "Recurring Host" :
                   a.listing?.spotType === "popup_opportunity" ? "Pop-Up" : "Spot",
        title: a.listing?.title ?? "Spot Listing",
        location: a.listing?.address ? `${a.listing.address}, ${a.listing.city}` : (a.listing?.city ?? "Oklahoma"),
        date: undefined,
        status: a.status,
        isRecurring: a.listing?.scheduleType === "recurring",
        href: `/spots/${a.listingId}`,
        priceInCents: a.listing?.priceInCents,
      }));

    const evtPending: Commitment[] = eventReservations
      .filter(r => r.status === "pending")
      .map(r => ({
        _key: `event-${r.id}`,
        kind: "event" as const,
        typeLabel: "Event",
        title: r.event?.name ?? "Event",
        location: r.event?.venueName ?? r.event?.city ?? "Oklahoma",
        date: r.event?.startDateTime,
        status: r.status,
        isRecurring: false,
        href: `/events/${r.eventId}`,
        priceInCents: r.paymentAmountInCents,
      }));

    return [...evtPending, ...spotPending];
  }, [spotApps, eventReservations]);

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
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [schedules]);

  const todaySchedules: ScheduleWindow[] = useMemo(() => {
    if (!schedules) return [];
    return schedules
      .filter(s => isToday(new Date(s.startDateTime)) || isToday(new Date(s.endDateTime)))
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .map(s => ({ id: s.id, venueName: s.venueName, startDateTime: s.startDateTime, endDateTime: s.endDateTime }));
  }, [schedules]);

  const fillFromSpot = (spot: { venueName: string; address: string; city: string }) => {
    setLocation(l => ({ ...l, venueName: spot.venueName, address: spot.address, city: spot.city }));
  };

  const addDay = () => {
    const last = days[days.length - 1];
    if (last) {
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
    setDays(d => d.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      if (field === "startDateTime" && value) {
        const newStart = new Date(value);
        const currentEnd = new Date(updated.endDateTime);
        if (currentEnd <= newStart) {
          const newEnd = new Date(newStart);
          newEnd.setHours(newEnd.getHours() + 4);
          updated.endDateTime = toLocalDatetimeString(newEnd);
        }
      }
      return updated;
    }));
  };

  const removeDay = (id: string) => {
    setDays(d => d.filter(row => row.id !== id));
  };

  const resetForm = () => {
    setLocation({ venueName: "", address: "", city: "", notes: "" });
    setDays([defaultDayRow()]);
    setShowAdd(false);
  };

  const invalidateTrucks = () => queryClient.invalidateQueries({ queryKey: ["/api/trucks"] });
  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTruck || !location.venueName || !location.city) return;
    if (days.length === 0) { toast({ title: "Add at least one date", variant: "destructive" }); return; }

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const start = new Date(day.startDateTime);
      const end = new Date(day.endDateTime);
      if (end <= start) {
        toast({
          title: `Invalid time on entry ${i + 1}`,
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }
    }

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

  const handleGoLiveConfirm = async (params: { lat?: number; lng?: number; liveUntil: Date; liveOutsideSchedule: boolean }) => {
    if (!myTruck) return;
    await checkInMutation.mutateAsync({
      id: myTruck.id,
      data: {
        latitude: params.lat ?? null,
        longitude: params.lng ?? null,
        liveUntil: params.liveUntil.toISOString(),
        liveOutsideSchedule: params.liveOutsideSchedule,
      } as any,
    });
    toast({ title: "You're live!", description: `Customers can find you until ${format(params.liveUntil, "h:mm a")}` });
    invalidateTrucks();
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
  const liveUntilDate = (myTruck as any).liveUntil ? new Date((myTruck as any).liveUntil) : null;
  const liveUntilLabel = liveUntilDate ? format(liveUntilDate, "h:mm a") : null;
  const isLiveOutsideSchedule = (myTruck as any).liveOutsideSchedule ?? false;
  const minsRemaining = liveUntilDate ? Math.max(0, Math.round((liveUntilDate.getTime() - now.getTime()) / 60000)) : null;
  const activeCommitments = commitmentView === "upcoming" ? confirmedCommitments : pendingCommitments;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">Where you're going, what's confirmed, and what's next.</p>
        </div>

        {/* ── COMMITMENTS SECTION ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Marketplace Commitments
            </h2>
            <Link href="/vendor/opportunities?tab=my-applications">
              <button className="text-xs text-primary hover:underline font-medium">View all →</button>
            </Link>
          </div>

          {/* Toggle: Confirmed / Pending */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-4">
            <button
              onClick={() => setCommitmentView("upcoming")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${commitmentView === "upcoming" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Confirmed
              {confirmedCommitments.length > 0 && (
                <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{confirmedCommitments.length}</span>
              )}
            </button>
            <button
              onClick={() => setCommitmentView("pending")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${commitmentView === "pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pending
              {pendingCommitments.length > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingCommitments.length}</span>
              )}
            </button>
          </div>

          {loadingCommitments ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : activeCommitments.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              {commitmentView === "upcoming" ? (
                <>
                  <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-foreground text-sm">No confirmed placements yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Once a host confirms your spot request, it appears here.</p>
                  <Link href="/vendor/opportunities">
                    <button className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
                      Find Opportunities
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-foreground text-sm">No pending applications</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Apply to events or spots and they'll appear here while awaiting a decision.</p>
                  <Link href="/vendor/opportunities">
                    <button className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
                      Browse Opportunities
                    </button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeCommitments.map(item => (
                <CommitmentCard key={item._key} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* ── LIVE STATUS BANNER ───────────────────────────────────────────────── */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            Today's Operations
          </h2>
          <div className={`p-4 rounded-2xl border ${myTruck.isLive ? 'bg-green-50 border-green-200' : 'bg-muted border-border'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {myTruck.isLive
                  ? <div className="relative flex-shrink-0"><Wifi className="w-5 h-5 text-green-600" /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" /></div>
                  : <WifiOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className={`font-semibold ${myTruck.isLive ? 'text-green-800' : 'text-foreground'}`}>
                    {myTruck.isLive ? "You're Live Now" : "Not Currently Live"}
                  </p>
                  {myTruck.isLive && liveUntilLabel && (
                    <p className="text-sm text-green-700 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      Live until {liveUntilLabel}
                      {minsRemaining !== null && minsRemaining <= 30 && (
                        <span className="ml-1 text-amber-700 font-medium">({minsRemaining}m left)</span>
                      )}
                      {isLiveOutsideSchedule && (
                        <span className="ml-2 text-amber-700 text-xs">(outside schedule)</span>
                      )}
                    </p>
                  )}
                  {!myTruck.isLive && todaySchedules.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {todaySchedules.some(s => new Date(s.startDateTime) <= now && new Date(s.endDateTime) >= now)
                        ? `Scheduled now · ${todaySchedules.find(s => new Date(s.startDateTime) <= now && new Date(s.endDateTime) >= now)?.venueName}`
                        : `Next stop · ${format(new Date(todaySchedules[0].startDateTime), "h:mm a")} at ${todaySchedules[0].venueName}`
                      }
                    </p>
                  )}
                </div>
              </div>
              {myTruck.isLive ? (
                <button
                  onClick={handleCheckOut}
                  disabled={checkOutMutation.isPending}
                  className="flex-shrink-0 px-4 py-2 bg-white border border-green-300 text-green-800 rounded-lg text-sm font-medium hover:bg-green-50 disabled:opacity-50"
                >
                  {checkOutMutation.isPending ? "Ending…" : "End Live Now"}
                </button>
              ) : (
                <button
                  onClick={() => setGoLiveModalOpen(true)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:scale-95 transition-transform"
                >
                  <Wifi className="w-4 h-4" />
                  Go Live
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── MANUAL STOPS SECTION ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Upcoming Stops
            </h2>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Stop
              </button>
            )}
          </div>

          {/* Add Stop Form */}
          {showAdd && (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Add Stop</h2>
                <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

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

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Date &amp; Time — {days.length} {days.length === 1 ? "day" : "days"}
                </h3>
                <div className="space-y-2">
                  {days.map((day, i) => {
                    const endBeforeStart = day.endDateTime && day.startDateTime
                      ? new Date(day.endDateTime) <= new Date(day.startDateTime)
                      : false;
                    return (
                    <div key={day.id} className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {days.length === 1 ? "Date & Time" : `Day ${i + 1}`}
                          </span>
                        </div>
                        {days.length > 1 && (
                          <button type="button" onClick={() => removeDay(day.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Start *
                          </label>
                          <input
                            required
                            type="datetime-local"
                            value={day.startDateTime}
                            onChange={e => updateDay(day.id, "startDateTime", e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                            style={{ colorScheme: "light" }}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-medium mb-1 ${endBeforeStart ? "text-destructive" : "text-muted-foreground"}`}>
                            End * {endBeforeStart && <span className="font-normal normal-case">(must be after start)</span>}
                          </label>
                          <input
                            required
                            type="datetime-local"
                            value={day.endDateTime}
                            min={day.startDateTime}
                            onChange={e => updateDay(day.id, "endDateTime", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground text-sm focus:outline-none transition-colors ${endBeforeStart ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"}`}
                            style={{ colorScheme: "light" }}
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

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

          {/* Stop list */}
          {isLoading ? (
            <LoadingSpinner />
          ) : upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming
                .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                .map(entry => {
                  const isActive = new Date(entry.startDateTime) <= now && new Date(entry.endDateTime) >= now;
                  return (
                    <div key={entry.id} className={`bg-card border rounded-2xl p-4 ${isActive ? 'border-green-300 bg-green-50' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-semibold text-foreground">{entry.venueName}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Active</span>
                            )}
                            {entry.isLive && (
                              <span className="px-1.5 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />Live
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
                            className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                          >
                            Set Live
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-foreground text-sm">No upcoming stops</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add schedule entries so customers know where to find you.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90"
              >
                + Add your first stop
              </button>
            </div>
          )}
        </section>
      </div>

      {goLiveModalOpen && (
        <GoLiveModal
          truckName={myTruck.name}
          todaySchedules={todaySchedules}
          onConfirm={handleGoLiveConfirm}
          onClose={() => setGoLiveModalOpen(false)}
        />
      )}
    </Layout>
  );
}

