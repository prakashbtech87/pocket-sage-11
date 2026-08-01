/**
 * Server-only helper that sends an email through the linked Gmail connection
 * via the Lovable connector gateway.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function encodeHeader(value: string): string {
  // RFC 2047 encoding so the subject can contain ₹ and other non-ASCII chars.
  const base64 = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${base64}?=`;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmail(options: { to: string; subject: string; html: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_MAIL_API_KEY;

  if (!lovableKey || !connectionKey) {
    throw new Error(
      "Gmail is not connected yet. Link the Gmail connection before sending reports.",
    );
  }

  const raw = [
    `From: ${encodeHeader("Prakash Expense Tracker (no-reply)")} <me>`,
    `To: ${options.to}`,
    `Subject: ${encodeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    options.html,
  ].join("\r\n");


  const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Gmail send failed [${response.status}]: ${body}`);
    throw new Error(`Gmail send failed [${response.status}]: ${body}`);
  }

  return (await response.json()) as { id: string };
}
