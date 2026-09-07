import { NextResponse } from "next/server";
import { DateTime, Interval } from "luxon";
import { getBookingById, getUserById, resolveBooking } from "@/lib/db";
import { getCalendarClient } from "@/lib/google";
import { getAvailableSlots } from "@/lib/availability";

export async function POST(request, { params }) {
  const body = await request.json();
  const { token, action, startUtc, endUtc } = body;

  const booking = await getBookingById(params.id);
  if (!booking || booking.action_token !== token) {
    return NextResponse.json({ error: "invalid_token" }, { status: 403 });
  }
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "already_resolved", status: booking.status }, { status: 409 });
  }

  const user = await getUserById(booking.user_id);
  const calendar = getCalendarClient(user.google_refresh_token);

  if (action === "confirm") {
    const updated = await resolveBooking(booking.id, { status: "confirmed" });
    return NextResponse.json({ ok: true, status: updated.status });
  }

  if (action === "decline") {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: booking.google_event_id,
      sendUpdates: "all", // lets the invitee know it's been cancelled
    });
    const updated = await resolveBooking(booking.id, { status: "declined" });
    return NextResponse.json({ ok: true, status: updated.status });
  }

  if (action === "reschedule") {
    if (!startUtc || !endUtc) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Re-check the new slot is still free — it may have filled since the
    // owner loaded the reschedule picker.
    const now = DateTime.utc();
    const freshSlots = await getAvailableSlots({
      user,
      rangeStartUtc: now.toISO(),
      rangeEndUtc: now.plus({ days: 14 }).toISO(),
    });
    const requested = Interval.fromDateTimes(
      DateTime.fromISO(startUtc, { zone: "utc" }),
      DateTime.fromISO(endUtc, { zone: "utc" })
    );
    const stillAvailable = freshSlots.some(
      (s) => s.startUtc === requested.start.toISO() && s.endUtc === requested.end.toISO()
    );
    if (!stillAvailable) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }

    await calendar.events.patch({
      calendarId: "primary",
      eventId: booking.google_event_id,
      sendUpdates: "all", // lets the invitee know the time changed
      requestBody: {
        start: { dateTime: startUtc },
        end: { dateTime: endUtc },
      },
    });
    const updated = await resolveBooking(booking.id, { status: "confirmed", start_utc: startUtc, end_utc: endUtc });
    return NextResponse.json({ ok: true, status: updated.status });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
