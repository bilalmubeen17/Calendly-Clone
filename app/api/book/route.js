import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { DateTime, Interval } from "luxon";
import { getUserBySlug, createBooking } from "@/lib/db";
import { getCalendarClient } from "@/lib/google";
import { getAvailableSlots } from "@/lib/availability";
import { notifyOwnerOfBooking } from "@/lib/notify";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { slug, startUtc, endUtc } = body;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!slug || !startUtc || !endUtc || !name || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const user = await getUserBySlug(slug);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    return await book({ request, user, startUtc, endUtc, name, email });
  } catch (err) {
    console.error("booking_failed", err);
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }
}

async function book({ request, user, startUtc, endUtc, name, email }) {
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
    conferenceDataVersion: 1, // required for Google to honor conferenceData below
    requestBody: {
      summary: `${name} <> ${user.name || "Meeting"}`,
      description: `Booked via scheduling link by ${name} (${email}).`,
      start: { dateTime: startUtc },
      end: { dateTime: endUtc },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: nanoid(12),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const bookingId = nanoid(12);
  const meetLink = event.hangoutLink || null;
  const actionToken = nanoid(24);
  await createBooking({
    id: bookingId,
    user_id: user.id,
    google_event_id: event.id,
    start_utc: startUtc,
    end_utc: endUtc,
    invitee_name: name,
    invitee_email: email,
    meet_link: meetLink,
    status: "pending",
    action_token: actionToken,
  });

  await notifyOwnerOfBooking({
    user,
    booking: {
      id: bookingId,
      start_utc: startUtc,
      end_utc: endUtc,
      invitee_name: name,
      invitee_email: email,
      meet_link: meetLink,
      action_token: actionToken,
    },
    appUrl: process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin,
  });

  return NextResponse.json({ ok: true, bookingId, meetLink });
}
