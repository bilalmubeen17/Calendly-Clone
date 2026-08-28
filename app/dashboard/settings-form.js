"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--panel)",
  color: "var(--ink)",
};

const labelStyle = { display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 };

export default function SettingsForm({ user, timezones }) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(user.timezone);
  const [dayStartHour, setDayStartHour] = useState(user.day_start_hour);
  const [dayEndHour, setDayEndHour] = useState(user.day_end_hour);
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(user.meeting_duration_minutes);
  const [bufferMinutes, setBufferMinutes] = useState(user.buffer_minutes);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone,
        day_start_hour: Number(dayStartHour),
        day_end_hour: Number(dayEndHour),
        meeting_duration_minutes: Number(meetingDurationMinutes),
        buffer_minutes: Number(bufferMinutes),
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="timezone">
            Calendar timezone
          </label>
          <select
            id="timezone"
            style={inputStyle}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="day_start_hour">
              Bookable from (hour, 0–23)
            </label>
            <input
              id="day_start_hour"
              type="number"
              min="0"
              max="23"
              style={inputStyle}
              value={dayStartHour}
              onChange={(e) => setDayStartHour(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="day_end_hour">
              Bookable until (hour, 1–24)
            </label>
            <input
              id="day_end_hour"
              type="number"
              min="1"
              max="24"
              style={inputStyle}
              value={dayEndHour}
              onChange={(e) => setDayEndHour(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="meeting_duration_minutes">
              Meeting length (minutes)
            </label>
            <input
              id="meeting_duration_minutes"
              type="number"
              min="5"
              max="480"
              style={inputStyle}
              value={meetingDurationMinutes}
              onChange={(e) => setMeetingDurationMinutes(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="buffer_minutes">
              Buffer between meetings (minutes)
            </label>
            <input
              id="buffer_minutes"
              type="number"
              min="0"
              max="120"
              style={inputStyle}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save settings"}
          </button>
          {status === "saved" && <span style={{ color: "var(--teal)", fontSize: 14 }}>Saved.</span>}
          {status === "error" && (
            <span style={{ color: "var(--amber)", fontSize: 14 }}>
              Couldn&apos;t save — check your bookable hours and try again.
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
