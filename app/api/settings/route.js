import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateUserSettings } from "@/lib/db";

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(request) {
  const uid = cookies().get("schedlink_uid")?.value;
  if (!uid) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const timezone = body.timezone;
  const dayStartHour = Number(body.day_start_hour);
  const dayEndHour = Number(body.day_end_hour);
  const meetingDurationMinutes = Number(body.meeting_duration_minutes);
  const bufferMinutes = Number(body.buffer_minutes);

  if (!isValidTimezone(timezone)) {
    return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
  }
  if (
    !Number.isInteger(dayStartHour) ||
    !Number.isInteger(dayEndHour) ||
    dayStartHour < 0 ||
    dayEndHour > 24 ||
    dayStartHour >= dayEndHour
  ) {
    return NextResponse.json({ error: "invalid_hours" }, { status: 400 });
  }
  if (!Number.isInteger(meetingDurationMinutes) || meetingDurationMinutes < 5 || meetingDurationMinutes > 480) {
    return NextResponse.json({ error: "invalid_duration" }, { status: 400 });
  }
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
    return NextResponse.json({ error: "invalid_buffer" }, { status: 400 });
  }

  const user = await updateUserSettings(uid, {
    timezone,
    day_start_hour: dayStartHour,
    day_end_hour: dayEndHour,
    meeting_duration_minutes: meetingDurationMinutes,
    buffer_minutes: bufferMinutes,
  });

  return NextResponse.json({ ok: true, user });
}
