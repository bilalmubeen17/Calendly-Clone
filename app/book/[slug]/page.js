"use client";

import { useEffect, useMemo, useState } from "react";

function groupByDay(slots, timeZone) {
  const groups = new Map();
  for (const slot of slots) {
    const d = new Date(slot.startUtc);
    const dayKey = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(d);
    if (!groups.has(dayKey)) groups.set(dayKey, []);
    groups.get(dayKey).push(slot);
  }
  return groups;
}

function formatTime(iso, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function BookingPage({ params }) {
  const { slug } = params;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [visitorTz, setVisitorTz] = useState("UTC");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error

  useEffect(() => {
    setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    fetch(`/api/availability/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError("network"));
  }, [slug]);

  const grouped = useMemo(() => {
    if (!data) return new Map();
    return groupByDay(data.slots, visitorTz);
  }, [data, visitorTz]);

  async function submitBooking(e) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          startUtc: selected.startUtc,
          endUtc: selected.endUtc,
          name: form.name,
          email: form.email,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "slot_taken") {
          setStatus("taken");
        } else {
          setStatus("error");
        }
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (error === "not_found") {
    return (
      <main className="shell">
        <h1 style={{ fontSize: 26 }}>This booking link doesn&apos;t exist.</h1>
        <p style={{ color: "var(--muted)" }}>Double check the link you were given.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell">
        <h1 style={{ fontSize: 26 }}>Couldn&apos;t load availability.</h1>
        <p style={{ color: "var(--muted)" }}>Try refreshing in a moment.</p>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="shell">
        <div className="eyebrow">Confirmed</div>
        <h1 style={{ fontSize: 28 }}>You&apos;re booked.</h1>
        <p style={{ color: "var(--muted)" }}>
          A calendar invite is on its way to {form.email}.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="shell">
        <p style={{ color: "var(--muted)" }}>Loading availability…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="eyebrow">Book a time</div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Pick a slot</h1>
      <p style={{ color: "var(--muted)", marginBottom: 8 }}>
        {data.meetingDurationMinutes}-minute meeting · times shown in
      </p>
      <select
        value={visitorTz}
        onChange={(e) => setVisitorTz(e.target.value)}
        style={{
          marginBottom: 24,
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "white",
          fontSize: 14,
        }}
      >
        <option value={visitorTz}>{visitorTz} (detected)</option>
        {visitorTz !== "UTC" && <option value="UTC">UTC</option>}
        {visitorTz !== data.ownerTimezone && (
          <option value={data.ownerTimezone}>{data.ownerTimezone} (host&apos;s time)</option>
        )}
      </select>

      {!selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[...grouped.entries()].map(([day, slots]) => (
            <div key={day}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{day}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map((s) => (
                  <button
                    key={s.startUtc}
                    className="btn secondary"
                    onClick={() => setSelected(s)}
                  >
                    {formatTime(s.startUtc, visitorTz)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {grouped.size === 0 && (
            <p style={{ color: "var(--muted)" }}>No open times in the next two weeks.</p>
          )}
        </div>
      )}

      {selected && status !== "submitting" && status !== "taken" && (
        <form onSubmit={submitBooking} className="card fade-in" style={{ maxWidth: 420 }}>
          <p style={{ marginTop: 0, fontSize: 15 }}>
            <strong>
              {formatTime(selected.startUtc, visitorTz)} – {formatTime(selected.endUtc, visitorTz)}
            </strong>{" "}
            <span style={{ color: "var(--muted)" }}>({visitorTz})</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <input
              required
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ padding: 10, borderRadius: 6, border: "1px solid var(--line)" }}
            />
            <input
              required
              type="email"
              placeholder="Your email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              style={{ padding: 10, borderRadius: 6, border: "1px solid var(--line)" }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn">
              Confirm booking
            </button>
            <button type="button" className="btn secondary" onClick={() => setSelected(null)}>
              Back
            </button>
          </div>
        </form>
      )}

      {status === "submitting" && <p style={{ color: "var(--muted)" }}>Booking…</p>}

      {status === "taken" && (
        <div className="card fade-in" style={{ maxWidth: 420 }}>
          <p style={{ marginTop: 0 }}>
            Someone just booked that slot. Pick another time below.
          </p>
          <button
            className="btn secondary"
            onClick={() => {
              setSelected(null);
              setStatus("idle");
              fetch(`/api/availability/${slug}`)
                .then((r) => r.json())
                .then(setData);
            }}
          >
            Choose another time
          </button>
        </div>
      )}

      {status === "error" && (
        <p style={{ color: "var(--muted)" }}>Something went wrong. Please try again.</p>
      )}
    </main>
  );
}
