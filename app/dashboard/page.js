import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db";
import CopyLinkButton from "./copy-link-button";

export default function Dashboard() {
  const uid = cookies().get("schedlink_uid")?.value;
  if (!uid) redirect("/");

  const user = getUserById(uid);
  if (!user) redirect("/");

  const bookingUrl = `${process.env.APP_URL}/book/${user.slug}`;

  return (
    <main className="shell">
      <div className="eyebrow">Your booking page</div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Hi {user.name?.split(" ")[0] || "there"}.</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>
        Share this link. Anyone who opens it sees whatever&apos;s actually open on
        your Google Calendar and can book straight onto it.
      </p>

      <div className="card">
        <div className="link-box">{bookingUrl}</div>
        <div style={{ marginTop: 16 }}>
          <CopyLinkButton url={bookingUrl} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Current settings</h3>
        <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 10, fontSize: 14, margin: 0 }}>
          <dt style={{ color: "var(--muted)" }}>Calendar timezone</dt>
          <dd style={{ margin: 0 }}>{user.timezone}</dd>
          <dt style={{ color: "var(--muted)" }}>Bookable hours</dt>
          <dd style={{ margin: 0 }}>
            {user.day_start_hour}:00 – {user.day_end_hour}:00, your local time
          </dd>
          <dt style={{ color: "var(--muted)" }}>Meeting length</dt>
          <dd style={{ margin: 0 }}>{user.meeting_duration_minutes} minutes</dd>
        </dl>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 16, marginBottom: 0 }}>
          To change these, edit the row for your account in the{" "}
          <code>users</code> table (or wire up a settings form — see README).
        </p>
      </div>
    </main>
  );
}
