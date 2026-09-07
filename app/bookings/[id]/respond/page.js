import { DateTime } from "luxon";
import { getBookingById, getUserById } from "@/lib/db";
import RespondActions from "./respond-actions";

function formatRange(startUtc, endUtc, timeZone) {
  const start = DateTime.fromISO(startUtc, { zone: "utc" }).setZone(timeZone);
  const end = DateTime.fromISO(endUtc, { zone: "utc" }).setZone(timeZone);
  return `${start.toFormat("ccc, LLL d")} · ${start.toFormat("h:mm a")}–${end.toFormat("h:mm a")} (${timeZone})`;
}

export default async function RespondPage({ params, searchParams }) {
  const booking = await getBookingById(params.id);
  if (!booking) {
    return (
      <main className="shell">
        <h1 style={{ fontSize: 26 }}>Booking not found.</h1>
      </main>
    );
  }

  const user = await getUserById(booking.user_id);
  const token = searchParams.token;

  if (!token || booking.action_token !== token) {
    if (booking.status !== "pending") {
      return (
        <main className="shell">
          <div className="eyebrow">Already handled</div>
          <h1 style={{ fontSize: 26 }}>This booking was already {booking.status}.</h1>
        </main>
      );
    }
    return (
      <main className="shell">
        <h1 style={{ fontSize: 26 }}>This link is invalid.</h1>
        <p style={{ color: "var(--muted)" }}>Double check the link from the notification email.</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Booking request</div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>{booking.invitee_name}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 8 }}>
        {formatRange(booking.start_utc, booking.end_utc, user.timezone)} · {booking.invitee_email}
      </p>
      {booking.meet_link && (
        <p style={{ marginBottom: 20 }}>
          Google Meet: <a href={booking.meet_link}>{booking.meet_link}</a>
        </p>
      )}
      <div className="card" style={{ marginTop: 12 }}>
        <RespondActions bookingId={booking.id} token={token} slug={user.slug} timeZone={user.timezone} />
      </div>
    </main>
  );
}
