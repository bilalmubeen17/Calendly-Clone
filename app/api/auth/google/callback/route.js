import { NextResponse } from "next/server";
import { google } from "googleapis";
import { nanoid } from "nanoid";
import { getOAuthClient } from "@/lib/google";
import { upsertUser } from "@/lib/db";

// Turns "Dr. Amina Khan" into "dr-amina-khan", falling back to a short
// random suffix if that slug is already taken (handled by the caller).
function slugify(name, fallbackSeed) {
  const base = (name || "user")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `user-${fallbackSeed}`;
}

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", origin));
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    // Google only sends a refresh_token the FIRST time a user consents (or
    // when prompt=consent forces re-issue, which getAuthUrl already sets).
    // If this still happens, the account likely has a prior grant to revoke
    // at https://myaccount.google.com/permissions before reconnecting.
    return NextResponse.redirect(new URL("/?error=no_refresh_token", origin));
  }

  client.setCredentials(tokens);

  // Pull the user's email/name and their calendar's timezone (Google stores
  // this per-calendar under "settings" / the calendar resource itself).
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  const calendar = google.calendar({ version: "v3", auth: client });
  const { data: calMeta } = await calendar.calendars.get({ calendarId: "primary" });

  const id = nanoid(12);
  const slug = slugify(profile.name, id.slice(0, 6));

  const user = upsertUser({
    id,
    slug,
    email: profile.email,
    name: profile.name,
    google_refresh_token: tokens.refresh_token,
    timezone: calMeta.timeZone || "America/Chicago",
  });

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  // Minimal session: just the user id, signed would be better for production
  // (see README "Hardening ideas"). Fine for getting this running.
  res.cookies.set("schedlink_uid", user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
