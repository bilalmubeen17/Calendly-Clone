import { getSessionUserId } from "@/lib/session";

const ERROR_MESSAGES = {
  missing_code: "Google sign-in was cancelled. Try again whenever you're ready.",
  no_refresh_token:
    "Google didn't grant ongoing access. Remove this app at myaccount.google.com/permissions, then connect again.",
  auth_failed: "Something went wrong connecting to Google. Please try again.",
};

const STEPS = [
  { title: "Connect", body: "Sign in with Google once." },
  { title: "Share", body: "Send your personal booking link." },
  { title: "Get booked", body: "Visitors pick an open time — it lands on your calendar with a Meet link." },
];

export default function Home({ searchParams }) {
  const signedIn = Boolean(getSessionUserId());
  const error = ERROR_MESSAGES[searchParams?.error];

  return (
    <main className="shell home">
      {error && <div className="notice">{error}</div>}

      <h1 className="home-title">Let people book time on your real calendar.</h1>
      <p className="home-lede">
        Whatever&apos;s free on your Google Calendar becomes bookable. No separate schedule to keep in sync.
      </p>

      {signedIn ? (
        <a className="btn" href="/dashboard">
          Go to your dashboard
        </a>
      ) : (
        <a className="btn" href="/api/auth/google">
          <GoogleIcon />
          Connect Google Calendar
        </a>
      )}

      <ol className="steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="step-num">{i + 1}</span>
            <div>
              <div className="step-title">{step.title}</div>
              <div className="step-body">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="google-icon">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
