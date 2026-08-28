import { Pool } from "pg";

// Supabase Postgres, reached over its pgbouncer connection-pooling endpoint
// so this works from serverless functions (each invocation gets its own
// short-lived connection rather than exhausting Postgres's connection limit).
// DATABASE_URL covers a manually-set connection string; POSTGRES_URL /
// POSTGRES_PRISMA_URL are what Vercel's Supabase integration injects.
const rawConnectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

// Supabase's connection string includes ?sslmode=require, which pg lets win
// over an explicit `ssl` option passed alongside `connectionString` — so
// Node's TLS layer ends up doing full certificate-chain verification and
// rejects Supabase's cert. Overriding sslmode to "no-verify" directly in the
// string is what actually disables that (pg maps it to rejectUnauthorized:
// false internally).
let connectionString = rawConnectionString;
if (rawConnectionString) {
  const connectionUrl = new URL(rawConnectionString);
  connectionUrl.searchParams.set("sslmode", "no-verify");
  connectionString = connectionUrl.toString();
}

const pool = new Pool({
  connectionString,
  max: 1,
});

// pg emits 'error' on the pool when an idle connection is dropped (e.g. by
// Supabase's pooler) — without a listener, that crashes the whole process
// instead of just failing the next query.
pool.on("error", (err) => {
  console.error("pg pool error", err);
});

let schemaReady;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        google_event_id TEXT,
        start_utc TEXT NOT NULL,
        end_utc TEXT NOT NULL,
        invitee_name TEXT NOT NULL,
        invitee_email TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  return schemaReady;
}

export async function getUserBySlug(slug) {
  await ensureSchema();
  const { rows } = await pool.query("SELECT * FROM users WHERE slug = $1", [slug]);
  return rows[0];
}

export async function getUserByEmail(email) {
  await ensureSchema();
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
}

export async function getUserById(id) {
  await ensureSchema();
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

export async function upsertUser(user) {
  await ensureSchema();
  const existing = await getUserByEmail(user.email);
  if (existing) {
    const { rows } = await pool.query(
      `UPDATE users SET google_refresh_token = $1, name = $2, timezone = $3
       WHERE email = $4 RETURNING *`,
      [user.google_refresh_token, user.name, user.timezone, user.email]
    );
    return rows[0];
  }
  const { rows } = await pool.query(
    `INSERT INTO users (id, slug, email, name, google_refresh_token, timezone)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user.id, user.slug, user.email, user.name, user.google_refresh_token, user.timezone]
  );
  return rows[0];
}

export async function updateUserSettings(id, settings) {
  await ensureSchema();
  const { rows } = await pool.query(
    `UPDATE users SET timezone = $1, day_start_hour = $2, day_end_hour = $3,
       meeting_duration_minutes = $4, buffer_minutes = $5
     WHERE id = $6 RETURNING *`,
    [
      settings.timezone,
      settings.day_start_hour,
      settings.day_end_hour,
      settings.meeting_duration_minutes,
      settings.buffer_minutes,
      id,
    ]
  );
  return rows[0];
}

export async function createBooking(booking) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO bookings (id, user_id, google_event_id, start_utc, end_utc, invitee_name, invitee_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      booking.id,
      booking.user_id,
      booking.google_event_id,
      booking.start_utc,
      booking.end_utc,
      booking.invitee_name,
      booking.invitee_email,
    ]
  );
}

export default pool;
