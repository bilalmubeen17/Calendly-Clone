import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "schedlink_uid";

// The cookie holds "<userId>.<hmac>" so it can't be forged by someone who
// learns (or guesses) a user id. Falls back to the Google client secret so a
// deploy that never set SESSION_SECRET still signs with something private.
function secret() {
  return process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function sessionCookieValue(userId) {
  return `${userId}.${sign(userId)}`;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

// Returns the signed-in user id, or null if the cookie is missing or tampered
// with (including old unsigned cookies — those users just reconnect once).
export function getSessionUserId() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}
