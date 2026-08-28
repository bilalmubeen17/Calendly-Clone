# SchedLink

A minimal Calendly-style app: a business connects their real Google Calendar,
gets a shareable booking link, and anyone who opens that link sees whatever's
actually free on that calendar — no separate "office hours" to maintain — and
can book straight onto it (in their own timezone).

## How it works

- **Connect once**: the business owner clicks "Connect Google Calendar" and
  authorizes via Google OAuth. We store a refresh token for their account.
- **Free/busy, not a manual schedule**: when someone opens the booking link,
  the server calls Google's `freebusy.query` API to see what's actually busy
  right now, and offers everything else (within a bookable hour range) as
  open.
- **Timezones**: all availability math happens in UTC internally. The owner's
  "bookable hours" (e.g. 7am–9pm) are anchored to their calendar's own
  timezone (read from Google, DST-safe). The visitor's browser timezone is
  auto-detected and used purely for display — they can also switch it
  manually.
- **Booking**: when a visitor confirms a time, we call `events.insert` on the
  owner's calendar with the visitor as an attendee. Google emails them both a
  real calendar invite automatically.

## 1. Google Cloud Console setup

You need OAuth credentials so the app is allowed to read/write a user's
Google Calendar on their behalf.

1. Go to https://console.cloud.google.com/ and create a new project (or pick
   an existing one).
2. **Enable the API**: in the sidebar, go to *APIs & Services → Library*,
   search "Google Calendar API", and click **Enable**.
3. **Configure the consent screen**: *APIs & Services → OAuth consent screen*.
   - User type: "External" (unless you're on Google Workspace and only your
     org will use this).
   - Fill in app name, support email, developer email.
   - Scopes: add `.../auth/calendar.events`, `.../auth/calendar.readonly`,
     and the default `userinfo.email` / `userinfo.profile`.
   - While in "Testing" mode, add the Google accounts you'll test with under
     **Test users** — Google blocks untested accounts otherwise. You'll need
     to submit for verification before arbitrary businesses can connect their
     own accounts in production (see "Going to production" below).
4. **Create credentials**: *APIs & Services → Credentials → Create
   Credentials → OAuth client ID*.
   - Application type: **Web application**.
   - Authorized redirect URIs — add exactly:
     - `http://localhost:3000/api/auth/google/callback` (local dev)
     - `https://yourdomain.com/api/auth/google/callback` (once deployed)
   - Save. Copy the **Client ID** and **Client Secret** shown.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL=...               # Supabase project → Connect → Connection pooling URI (port 6543)
GOOGLE_CLIENT_ID=...           # from step 1
GOOGLE_CLIENT_SECRET=...       # from step 1
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
APP_URL=http://localhost:3000
SESSION_SECRET=<output of: openssl rand -hex 32>
```

## 3. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, click **Connect Google Calendar**, sign in
with a *test user* account you added in step 1, grant access, and you'll land
on `/dashboard` with your booking link — something like:

```
http://localhost:3000/book/your-name
```

Open that link in an incognito window (or send it to someone else) to try
the booking flow end to end. Whatever's actually on your calendar right now
should show up as busy, and everything else in your 7am–9pm window should be
bookable.

## Data storage

Everything is stored in Supabase Postgres, reached via `DATABASE_URL` — the
tables (`CREATE TABLE IF NOT EXISTS`) are created automatically on first
query. Two tables:

- `users` — one row per business owner: their slug, refresh token, timezone,
  bookable hour range, meeting length.
- `bookings` — one row per confirmed booking, plus the Google event ID it
  created.

Bookable hours, meeting length, buffer time, and timezone are all editable
from the Settings card on `/dashboard` (backed by `PATCH /api/settings`).

## Going to production

A few things worth doing before this is public-facing for real businesses:

- **Verify your OAuth app with Google** (*OAuth consent screen → Publish
  app*) — otherwise only the test users you explicitly listed can connect,
  and everyone else sees an "unverified app" warning.
- **Sign the session cookie** — right now `schedlink_uid` is just the raw
  user id. Fine for a first deploy behind HTTPS, but sign or encrypt it
  (e.g. with `SESSION_SECRET`) before this handles real customer data.
- **Handle Google token revocation** — if a user disconnects the app from
  their Google account, calendar calls will start failing with an auth
  error; catch that and prompt them to reconnect.
- **Add cancellation** — right now there's no way to cancel a booking from
  the app side (deleting the Google Calendar event directly works fine as a
  stopgap).

## Project layout

```
app/
  page.js                        landing page + "Connect" button
  dashboard/page.js               shows the owner their link + settings
  book/[slug]/page.js             public booking page (visitor-facing)
  api/auth/google/route.js        starts the OAuth flow
  api/auth/google/callback/route.js   exchanges code, creates the user
  api/availability/[slug]/route.js   returns open slots for a business
  api/book/route.js               creates a booking on Google Calendar
lib/
  db.js                           Postgres (Supabase) schema + queries
  google.js                       OAuth client + Calendar API client
  availability.js                 freebusy fetch + slot-slicing logic
```
# Calendly-Clone
