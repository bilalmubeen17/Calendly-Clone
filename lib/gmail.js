import { getGmailClient } from "./google";

// Gmail's API takes a full RFC 2822 message, base64url-encoded, rather than
// separate to/subject/body fields.
function encodeMessage({ to, subject, html }) {
  const message = [`To: ${to}`, "Content-Type: text/html; charset=utf-8", "MIME-Version: 1.0", `Subject: ${subject}`, "", html].join(
    "\n"
  );
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Sends as the calendar owner's own Gmail address — requires the gmail.send
// scope, which existing users need to reconnect Google Calendar to grant.
export async function sendOwnerEmail({ refreshToken, to, subject, html }) {
  const gmail = getGmailClient(refreshToken);
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodeMessage({ to, subject, html }) },
  });
}
