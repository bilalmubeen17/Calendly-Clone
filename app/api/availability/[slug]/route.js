import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getUserBySlug } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(request, { params }) {
  const user = getUserBySlug(params.slug);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = DateTime.utc();
  const rangeStartUtc = now.toISO();
  const rangeEndUtc = now.plus({ days: 14 }).toISO();

  try {
    const slots = await getAvailableSlots({ user, rangeStartUtc, rangeEndUtc });
    return NextResponse.json({
      slots,
      ownerTimezone: user.timezone,
      meetingDurationMinutes: user.meeting_duration_minutes,
    });
  } catch (err) {
    console.error("availability_error", err);
    return NextResponse.json({ error: "availability_failed" }, { status: 500 });
  }
}
