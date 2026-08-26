import { DateTime, Interval } from "luxon";
import { getCalendarClient } from "./google";

/**
 * Returns bookable slots as an array of { startUtc, endUtc } ISO strings.
 *
 * How this works:
 * 1. Ask Google's freebusy API what's already busy on the owner's calendar
 *    (Google returns this in UTC).
 * 2. Walk each day in the requested range, build that day's "open window"
 *    (e.g. 7am-9pm) IN THE OWNER'S TIMEZONE, using the IANA zone name so
 *    daylight saving shifts are handled automatically rather than a fixed
 *    UTC offset that would drift twice a year.
 * 3. Subtract the busy blocks from each day's open window.
 * 4. Slice whatever's left into meeting-length chunks.
 *
 * Everything is compared/stored in UTC internally; only the day-boundary
 * math (what does "7am" mean) uses the owner's local zone.
 */
export async function getAvailableSlots({
  user,
  rangeStartUtc, // ISO string, e.g. now
  rangeEndUtc, // ISO string, e.g. now + 14 days
}) {
  const calendar = getCalendarClient(user.google_refresh_token);

  const freebusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: rangeStartUtc,
      timeMax: rangeEndUtc,
      items: [{ id: "primary" }],
    },
  });

  const busyBlocks = (freebusyRes.data.calendars?.primary?.busy || []).map((b) =>
    Interval.fromDateTimes(DateTime.fromISO(b.start, { zone: "utc" }), DateTime.fromISO(b.end, { zone: "utc" }))
  );

  const zone = user.timezone;
  const dayStart = DateTime.fromISO(rangeStartUtc, { zone: "utc" }).setZone(zone).startOf("day");
  const dayEnd = DateTime.fromISO(rangeEndUtc, { zone: "utc" }).setZone(zone).startOf("day");

  const slots = [];
  const durationMin = user.meeting_duration_minutes;
  const bufferMin = user.buffer_minutes || 0;
  const step = durationMin + bufferMin;

  for (let day = dayStart; day <= dayEnd; day = day.plus({ days: 1 })) {
    // Build today's open window in the owner's local time, then convert to UTC.
    const windowStartLocal = day.set({ hour: user.day_start_hour, minute: 0, second: 0, millisecond: 0 });
    const windowEndLocal = day.set({ hour: user.day_end_hour, minute: 0, second: 0, millisecond: 0 });

    let cursor = windowStartLocal.toUTC();
    const windowEndUtc = windowEndLocal.toUTC();

    while (cursor.plus({ minutes: durationMin }) <= windowEndUtc) {
      const slotInterval = Interval.fromDateTimes(cursor, cursor.plus({ minutes: durationMin }));

      // Skip slots that are already in the past.
      const now = DateTime.utc();
      const overlapsBusy = busyBlocks.some((busy) => busy.overlaps(slotInterval));
      const isPast = slotInterval.start < now;

      if (!overlapsBusy && !isPast) {
        slots.push({
          startUtc: slotInterval.start.toISO(),
          endUtc: slotInterval.end.toISO(),
        });
      }

      cursor = cursor.plus({ minutes: step });
    }
  }

  return slots;
}
