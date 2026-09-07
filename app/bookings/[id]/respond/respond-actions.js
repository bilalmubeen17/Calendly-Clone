"use client";

import { useState } from "react";
import { groupByDay, formatTime } from "@/lib/slots";

export default function RespondActions({ bookingId, token, slug, timeZone }) {
  const [mode, setMode] = useState("idle"); // idle | rescheduling | submitting | done
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState(null);
  const [loadError, setLoadError] = useState(null);

  async function act(action, extra = {}) {
    const wasRescheduling = mode === "rescheduling";
    setMode("submitting");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error === "slot_taken" ? "That time just got booked — pick another." : "Something went wrong.");
        setMode(wasRescheduling ? "rescheduling" : "idle");
        return;
      }
      setResult(json.status);
      setMode("done");
    } catch {
      setLoadError("Network error. Try again.");
      setMode(wasRescheduling ? "rescheduling" : "idle");
    }
  }

  async function startReschedule() {
    setMode("rescheduling");
    setLoadError(null);
    try {
      const res = await fetch(`/api/availability/${slug}`);
      const json = await res.json();
      setSlots(json.slots || []);
    } catch {
      setLoadError("Couldn't load availability.");
    }
  }

  if (mode === "done") {
    return <p style={{ margin: 0 }}>Done — this booking is now <strong>{result}</strong>.</p>;
  }

  if (mode === "rescheduling" || (mode === "submitting" && slots)) {
    const grouped = slots ? groupByDay(slots, timeZone) : null;
    return (
      <div>
        {loadError && <p style={{ color: "var(--amber)", marginBottom: 12 }}>{loadError}</p>}
        {!slots && <p style={{ color: "var(--muted)", margin: 0 }}>Loading open times…</p>}
        {grouped && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[...grouped.entries()].map(([day, daySlots]) => (
              <div key={day}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{day}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {daySlots.map((s) => (
                    <button
                      key={s.startUtc}
                      className="btn secondary"
                      disabled={mode === "submitting"}
                      onClick={() => act("reschedule", { startUtc: s.startUtc, endUtc: s.endUtc })}
                    >
                      {formatTime(s.startUtc, timeZone)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {grouped.size === 0 && <p style={{ color: "var(--muted)" }}>No open times in the next two weeks.</p>}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button className="btn secondary" onClick={() => setMode("idle")}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button className="btn" onClick={() => act("confirm")} disabled={mode === "submitting"}>
        Confirm
      </button>
      <button className="btn secondary" onClick={startReschedule} disabled={mode === "submitting"}>
        Propose a new time
      </button>
      <button className="btn secondary" onClick={() => act("decline")} disabled={mode === "submitting"}>
        Decline
      </button>
    </div>
  );
}
