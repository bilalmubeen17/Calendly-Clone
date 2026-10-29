import { DateTime } from "luxon";
import { sendOwnerEmail } from "./gmail";

function formatRange(startUtc, endUtc, timeZone) {
  const start = DateTime.fromISO(startUtc, { zone: "utc" }).setZone(timeZone);
  const end = DateTime.fromISO(endUtc, { zone: "utc" }).setZone(timeZone);
  return `${start.toFormat("ccc, LLL d")} · ${start.toFormat("h:mm a")}–${end.toFormat("h:mm a")} (${timeZone})`;
}

// Visitor-typed values go into an HTML email, so they must not be able to
// inject markup (fake links, etc.).
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The booking is already confirmed on the calendar by the time this fires —
// this just gives the owner a way to decline or reschedule it afterward.
// Failures here must never fail the booking itself, since a token that
// predates the gmail.send scope (existing users who haven't reconnected)
// is the most likely cause.
export async function notifyOwnerOfBooking({ user, booking, appUrl }) {
  const when = formatRange(booking.start_utc, booking.end_utc, user.timezone);
  const respondUrl = `${appUrl}/bookings/${booking.id}/respond?token=${booking.action_token}`;

  const html = `
    <p><strong>${escapeHtml(booking.invitee_name)}</strong> (${escapeHtml(booking.invitee_email)}) just booked <strong>${when}</strong>.</p>
    ${booking.meet_link ? `<p>Google Meet: <a href="${escapeHtml(booking.meet_link)}">${escapeHtml(booking.meet_link)}</a></p>` : ""}
    <p>It's already on your calendar. If that time doesn't actually work, you can decline it or pick a new time:</p>
    <p><a href="${respondUrl}">Review this booking</a></p>
  `.trim();

  try {
    await sendOwnerEmail({
      refreshToken: user.google_refresh_token,
      to: user.email,
      subject: `New booking: ${booking.invitee_name} — ${when}`,
      html,
    });
  } catch (err) {
    console.error("owner_notification_failed", err);
  }
}
