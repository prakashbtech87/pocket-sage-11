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

let cachedSender: string | null | undefined;

async function getSenderAddress(lovableKey: string, connectionKey: string) {
  if (cachedSender !== undefined) return cachedSender;
  try {
    const res = await fetch(`${GATEWAY_URL}/users/me/profile`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
    });
    if (!res.ok) {
      cachedSender = null;
      return cachedSender;
    }
    const body = (await res.json()) as { emailAddress?: string };
    cachedSender = body.emailAddress ?? null;
  } catch {
    cachedSender = null;
  }
  return cachedSender;
}

export async function sendGmail(options: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_MAIL_API_KEY;

  if (!lovableKey || !connectionKey) {
    throw new Error(
      "Gmail is not connected yet. Link the Gmail connection before sending reports.",
    );
  }

  const senderAddress = await getSenderAddress(lovableKey, connectionKey);

  const raw = [
    // Recipients see the app's display name first; the mailbox itself stays machine-only.
    ...(senderAddress
      ? [
          `From: ${encodeHeader(options.fromName ?? "Prakash Expense Tracker (no-reply)")} <${senderAddress}>`,
        ]
      : []),
    `To: ${options.to}`,
    ...(options.replyTo ? [`Reply-To: ${options.replyTo}`] : []),
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
