import { ScheduleEntry } from "@workspace/db";

export type TruckStatus = "open" | "closing_soon" | "opening_later" | "closed";

export function computeTruckStatus(schedules: ScheduleEntry[], isLive: boolean): {
  status: TruckStatus;
  activeSchedule: ScheduleEntry | null;
  currentLocation: string | null;
  currentCity: string | null;
} {
  const now = new Date();

  const active = schedules.find(s => s.startDateTime <= now && s.endDateTime >= now);
  if (active) {
    return {
      status: "open",
      activeSchedule: active,
      currentLocation: active.venueName,
      currentCity: active.city,
    };
  }

  // Live check-in always wins — whether inside or outside a scheduled slot
  if (isLive) {
    const liveSchedule = schedules.find(s => s.isLive);
    if (liveSchedule) {
      return {
        status: "open",
        activeSchedule: liveSchedule,
        currentLocation: liveSchedule.venueName,
        currentCity: liveSchedule.city,
      };
    }
    // Live outside any schedule (vendor checked in manually)
    return {
      status: "open",
      activeSchedule: null,
      currentLocation: null,
      currentCity: null,
    };
  }

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const upcoming = schedules
    .filter(s => s.startDateTime > now && s.startDateTime <= todayEnd)
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  if (upcoming.length > 0) {
    const next = upcoming[0];
    return {
      status: "opening_later",
      activeSchedule: next,
      currentLocation: next.venueName,
      currentCity: next.city,
    };
  }

  return { status: "closed", activeSchedule: null, currentLocation: null, currentCity: null };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
