import { db, trucksTable, scheduleEntriesTable } from "@workspace/db";
import { and, eq, lte, or, isNotNull, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const HEARTBEAT_STALE_MS = 10 * 60_000; // 10 minutes without a heartbeat ends the shift
const TICK_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

async function runOnce(): Promise<void> {
  const now = new Date();
  const heartbeatCutoff = new Date(now.getTime() - HEARTBEAT_STALE_MS);

  const expiredByTimer = or(
    and(isNotNull(trucksTable.liveUntil), lte(trucksTable.liveUntil, now)),
    and(
      isNotNull(trucksTable.currentLocationUpdatedAt),
      lte(trucksTable.currentLocationUpdatedAt, heartbeatCutoff),
    ),
  );

  const stale = await db
    .select({ id: trucksTable.id })
    .from(trucksTable)
    .where(and(eq(trucksTable.isLive, true), expiredByTimer));

  if (stale.length === 0) return;

  const ids = stale.map((r) => r.id);
  await db
    .update(trucksTable)
    .set({
      isLive: false,
      currentLatitude: null,
      currentLongitude: null,
      currentLocationUpdatedAt: null,
      currentLocationAccuracyMeters: null,
      currentHeadingDegrees: null,
      currentSpeedMps: null,
      liveUntil: null,
      liveStartedAt: null,
      liveOutsideSchedule: false,
    })
    .where(inArray(trucksTable.id, ids));

  await db
    .update(scheduleEntriesTable)
    .set({ isLive: false })
    .where(inArray(scheduleEntriesTable.truckId, ids));

  logger.info({ truckIds: ids }, "Expired stale live shifts");
}

export function startExpireStaleShiftsJob(): void {
  if (timer) return;
  runOnce().catch((err) => logger.warn({ err }, "expireStaleShifts first run failed"));
  timer = setInterval(() => {
    runOnce().catch((err) => logger.warn({ err }, "expireStaleShifts tick failed"));
  }, TICK_MS);
  // Ensure the timer does not keep the process alive during shutdown
  timer.unref?.();
  logger.info({ tickMs: TICK_MS }, "expireStaleShifts job started");
}

export function stopExpireStaleShiftsJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
