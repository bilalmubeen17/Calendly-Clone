import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db";
import CopyLinkButton from "./copy-link-button";
import SettingsForm from "./settings-form";

export default async function Dashboard() {
  const uid = cookies().get("schedlink_uid")?.value;
  if (!uid) redirect("/");

  const user = await getUserById(uid);
  if (!user) redirect("/");

  const origin = `${headers().get("x-forwarded-proto") || "http"}://${headers().get("host")}`;
  const bookingUrl = `${origin}/book/${user.slug}`;

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
        <h3 style={{ fontSize: 16, marginBottom: 18 }}>Settings</h3>
        <SettingsForm user={user} timezones={Intl.supportedValuesOf("timeZone")} />
      </div>
    </main>
  );
}
