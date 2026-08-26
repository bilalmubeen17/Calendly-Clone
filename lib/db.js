import Database from "better-sqlite3";
import path from "path";

// Single SQLite file on disk. Fine for a solo business or a handful of them.
// If you outgrow it (many businesses, multiple servers), swap this file for
// a Postgres client — the query shapes below are simple enough to port directly.
const db = new Database(path.join(process.cwd(), "schedlink.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    google_refresh_token TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    day_start_hour INTEGER NOT NULL DEFAULT 7,
    day_end_hour INTEGER NOT NULL DEFAULT 21,
    meeting_duration_minutes INTEGER NOT NULL DEFAULT 30,
    buffer_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    google_event_id TEXT,
    start_utc TEXT NOT NULL,
    end_utc TEXT NOT NULL,
    invitee_name TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getUserBySlug(slug) {
  return db.prepare("SELECT * FROM users WHERE slug = ?").get(slug);
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function upsertUser(user) {
  const existing = getUserByEmail(user.email);
  if (existing) {
    db.prepare(
      `UPDATE users SET google_refresh_token = ?, name = ?, timezone = ? WHERE email = ?`
    ).run(user.google_refresh_token, user.name, user.timezone, user.email);
    return getUserByEmail(user.email);
  }
  db.prepare(
    `INSERT INTO users (id, slug, email, name, google_refresh_token, timezone)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(user.id, user.slug, user.email, user.name, user.google_refresh_token, user.timezone);
  return getUserByEmail(user.email);
}

export function createBooking(booking) {
  db.prepare(
    `INSERT INTO bookings (id, user_id, google_event_id, start_utc, end_utc, invitee_name, invitee_email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    booking.id,
    booking.user_id,
    booking.google_event_id,
    booking.start_utc,
    booking.end_utc,
    booking.invitee_name,
    booking.invitee_email
  );
}

export default db;
