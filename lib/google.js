import { google } from "googleapis";

// One OAuth2 client factory. In "connect" mode (no refresh token yet) it's used
// to build the consent-screen URL and to exchange the returned code.
// In "act on behalf of a user" mode, pass their stored refresh token and it
// will silently mint fresh access tokens as needed.
export function getOAuthClient(refreshToken) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }
  return client;
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token back
    prompt: "consent", // forces Google to re-issue a refresh_token even on repeat connects
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  });
}

export function getCalendarClient(refreshToken) {
  const auth = getOAuthClient(refreshToken);
  return google.calendar({ version: "v3", auth });
}
