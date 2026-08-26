export default function Home() {
  return (
    <main className="shell">
      <div className="eyebrow">SchedLink</div>
      <h1 style={{ fontSize: 40, marginBottom: 16 }}>
        Turn your real calendar into a booking page.
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.6, maxWidth: 520 }}>
        Connect Google Calendar once. Whatever&apos;s actually free on it becomes
        bookable — no separate schedule to keep in sync.
      </p>
      <div style={{ marginTop: 32 }}>
        <a className="btn" href="/api/auth/google">
          Connect Google Calendar
        </a>
      </div>
    </main>
  );
}
