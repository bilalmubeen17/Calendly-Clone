// Client-safe formatting helpers shared by anything that renders a list of
// bookable slots (the visitor booking page, the owner's reschedule picker).
export function groupByDay(slots, timeZone) {
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

export function formatTime(iso, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
