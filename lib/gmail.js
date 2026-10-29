import { getGmailClient } from "./google";

// Header values can't contain line breaks (they'd inject extra headers), and
// non-ASCII text (names, "—") must be RFC 2047-encoded or it shows up garbled.
function encodeHeader(value) {
  const clean = String(value).replace(/[\r\n]+/g, " ");
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean).toString("base64")}?=`;
}

// Gmail's API takes a full RFC 2822 message, base64url-encoded, rather than
// separate to/subject/body fields.
function encodeMessage({ to, subject, html }) {
  const message = [
    `To: ${encodeHeader(to)}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${encodeHeader(subject)}`,
    "",
    html,
  ].join("\r\n");
  return Buffer.from(message).toString("base64url");
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
