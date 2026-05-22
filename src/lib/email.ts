import { logger } from "./logger";
import { getEnvDigestEmailRecipients } from "./report-digests";

export type EmailSendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export function getDigestEmailRecipients() {
  return getEnvDigestEmailRecipients();
}

export function emailProviderStatus() {
  return {
    provider: process.env.RESEND_API_KEY ? "resend" : null,
    configured: Boolean(process.env.RESEND_API_KEY && process.env.REPORT_DIGEST_EMAIL_FROM),
    digestRecipients: getDigestEmailRecipients().length,
  };
}

export async function sendEmail(input: EmailSendInput) {
  const from = process.env.REPORT_DIGEST_EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!from || !apiKey || to.length === 0) {
    logger.warn("email_delivery_skipped", {
      reason: "provider_or_recipient_not_configured",
      hasFrom: Boolean(from),
      hasApiKey: Boolean(apiKey),
      recipientCount: to.length,
    });
    return { sent: false, skipped: true, reason: "provider_or_recipient_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    logger.error("email_delivery_failed", { status: response.status, result });
    throw new Error(`Email delivery failed with status ${response.status}`);
  }

  logger.info("email_delivered", { recipientCount: to.length, subject: input.subject, result });
  return { sent: true, skipped: false, result };
}
