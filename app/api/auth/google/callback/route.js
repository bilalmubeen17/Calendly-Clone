import { NextResponse } from "next/server";
import { google } from "googleapis";
import { nanoid } from "nanoid";
import { getOAuthClient } from "@/lib/google";
import { upsertUser } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, sessionCookieValue } from "@/lib/session";

// Turns "Dr. Amina Khan" into "dr-amina-khan". If that slug is already taken
// by someone else, upsertUser appends a short suffix.
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
    // Also where Google lands us when the user clicks "Cancel" on consent.
    return NextResponse.redirect(new URL("/?error=missing_code", origin));
  }

  let user;
  try {
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
    user = await upsertUser({
      id,
      slug: slugify(profile.name, id.slice(0, 6)),
      email: profile.email,
      name: profile.name,
      google_refresh_token: tokens.refresh_token,
      timezone: calMeta.timeZone || "America/Chicago",
    });
  } catch (err) {
    // Expired/reused codes, a revoked grant, or the database being down.
    console.error("oauth_callback_failed", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", origin));
  }

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.set(SESSION_COOKIE, sessionCookieValue(user.id), sessionCookieOptions);
  return res;
}
