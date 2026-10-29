import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import CopyLinkButton from "./copy-link-button";
import SettingsForm from "./settings-form";

export default async function Dashboard() {
  const uid = getSessionUserId();
  if (!uid) redirect("/");

  const user = await getUserById(uid);
  if (!user) redirect("/");

  // Prefer the configured public domain so the shared link is stable no
  // matter which hostname (e.g. the *.vercel.app alias) the owner landed on.
  const origin =
    process.env.APP_URL?.replace(/\/$/, "") ||
    `${headers().get("x-forwarded-proto") || "http"}://${headers().get("host")}`;
  const bookingUrl = `${origin}/book/${user.slug}`;

  // Google calendars can report zones (e.g. "UTC") that aren't in this list;
  // without them the dropdown would silently switch zones on the next save.
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes(user.timezone)) timezones.unshift(user.timezone);

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
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <CopyLinkButton url={bookingUrl} />
          <a className="btn secondary" href={bookingUrl} target="_blank" rel="noreferrer">
            Preview
          </a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 18 }}>Settings</h3>
        <SettingsForm user={user} timezones={timezones} />
      </div>

      <form action="/api/auth/logout" method="post" style={{ marginTop: 28 }}>
        <button type="submit" className="link-button">
          Sign out
        </button>
      </form>
    </main>
  );
}
