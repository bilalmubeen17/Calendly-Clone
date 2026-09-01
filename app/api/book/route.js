import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { DateTime, Interval } from "luxon";
import { getUserBySlug, createBooking } from "@/lib/db";
import { getCalendarClient } from "@/lib/google";
import { getAvailableSlots } from "@/lib/availability";

export async function POST(request) {
  const body = await request.json();
  const { slug, startUtc, endUtc, name, email } = body;

  if (!slug || !startUtc || !endUtc || !name || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const user = await getUserBySlug(slug);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Re-check the slot is still free right before booking — someone else may
  // have taken it between the visitor loading the page and clicking confirm.
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

  const calendar = getCalendarClient(user.google_refresh_token);

  const { data: event } = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all", // emails the invitee an actual calendar invite
    requestBody: {
      summary: `${name} <> ${user.name || "Meeting"}`,
      description: `Booked via scheduling link by ${name} (${email}).`,
      start: { dateTime: startUtc },
      end: { dateTime: endUtc },
      attendees: [{ email }],
    },
  });

  const bookingId = nanoid(12);
  await createBooking({
    id: bookingId,
    user_id: user.id,
    google_event_id: event.id,
    start_utc: startUtc,
    end_utc: endUtc,
    invitee_name: name,
    invitee_email: email,
  });

  return NextResponse.json({ ok: true, bookingId });
}
