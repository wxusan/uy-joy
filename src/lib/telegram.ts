import { Prisma, PrismaClient, TelegramNotificationLog } from "@prisma/client";
import prisma from "./prisma";
import { leadSourceLabel } from "./lead-sources";
import { captureServerEvent } from "./server-analytics";

type Db = PrismaClient | Prisma.TransactionClient;

const TELEGRAM_RETRY_BACKOFF_MINUTES = [1, 5, 15] as const;

export type LeadTelegramPayload = {
  id: string;
  clientId?: string | null;
  name: string;
  phone: string;
  source?: string | null;
  projectName?: string | null;
  unitLabel?: string | null;
  preferredLanguage?: string | null;
  utmCampaign?: string | null;
  createdAt?: Date | string | null;
};

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function formatTashkentDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildLeadTelegramMessage(
  lead: LeadTelegramPayload,
  options: { crmEnabled?: boolean; crmBaseUrl?: string | null; locale?: string } = {}
) {
  const crmLink =
    options.crmEnabled && options.crmBaseUrl
      ? `${options.crmBaseUrl.replace(/\/$/, "")}/portal/management-x7k9/crm/leads/${lead.id}`
      : null;
  return [
    "New lead",
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Source: ${leadSourceLabel(lead.source, options.locale || lead.preferredLanguage || "uz")}`,
    `Project: ${lead.projectName || "-"}`,
    `Unit: ${lead.unitLabel || "-"}`,
    `Language: ${lead.preferredLanguage || "-"}`,
    `Campaign: ${lead.utmCampaign || "-"}`,
    `Time: ${formatTashkentDate(lead.createdAt)}`,
    crmLink ? "" : null,
    crmLink ? `CRM: ${crmLink}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function createTelegramNotificationLog(
  lead: LeadTelegramPayload,
  options: { crmEnabled?: boolean; crmBaseUrl?: string | null; locale?: string } = {},
  db: Db = prisma
) {
  const messageText = buildLeadTelegramMessage(lead, options);
  return db.telegramNotificationLog.create({
    data: {
      leadId: lead.id,
      clientId: lead.clientId || null,
      chatId: process.env.TELEGRAM_CHAT_ID || null,
      status: "pending",
      messageText,
      attemptCount: 0,
      nextAttemptAt: new Date(),
    },
  });
}

export async function sendTelegramMessage(input: { chatId: string; text: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  if (!input.chatId) throw new Error("TELEGRAM_CHAT_ID is not configured");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      disable_web_page_preview: true,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || `Telegram API returned ${response.status}`);
  }

  return {
    telegramMessageId: payload.result?.message_id ? String(payload.result.message_id) : null,
  };
}

export function nextTelegramAttempt(attemptCount: number, now = new Date()) {
  const backoff = TELEGRAM_RETRY_BACKOFF_MINUTES[Math.min(attemptCount, TELEGRAM_RETRY_BACKOFF_MINUTES.length - 1)];
  return new Date(now.getTime() + backoff * 60_000);
}

export async function processTelegramNotification(log: TelegramNotificationLog, db: Db = prisma) {
  const now = new Date();
  try {
    const sent = await sendTelegramMessage({
      chatId: log.chatId || process.env.TELEGRAM_CHAT_ID || "",
      text: log.messageText,
    });
    await db.telegramNotificationLog.update({
      where: { id: log.id },
      data: {
        status: "sent",
        telegramMessageId: sent.telegramMessageId,
        errorMessage: null,
        lastAttemptAt: now,
        sentAt: now,
      },
    });
    captureServerEvent(
      "telegram_notification_sent",
      { leadId: log.leadId, chatId: log.chatId },
      log.clientId ?? "server"
    );
    return { id: log.id, status: "sent" as const };
  } catch (error) {
    const attemptCount = log.attemptCount + 1;
    const finalFailure = attemptCount >= TELEGRAM_RETRY_BACKOFF_MINUTES.length;
    const errorMessage = error instanceof Error ? error.message : "Telegram send failed";
    await db.telegramNotificationLog.update({
      where: { id: log.id },
      data: {
        status: finalFailure ? "failed" : "pending",
        errorMessage,
        attemptCount,
        lastAttemptAt: now,
        nextAttemptAt: finalFailure ? null : nextTelegramAttempt(attemptCount, now),
      },
    });
    if (finalFailure) {
      captureServerEvent(
        "telegram_notification_failed",
        { leadId: log.leadId, chatId: log.chatId, errorMessage, attemptCount },
        log.clientId ?? "server"
      );
    }
    return { id: log.id, status: finalFailure ? ("failed" as const) : ("pending" as const) };
  }
}

export async function processTelegramOutbox(limit = 25, db: Db = prisma) {
  const now = new Date();
  const logs = await db.telegramNotificationLog.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      attemptCount: { lt: TELEGRAM_RETRY_BACKOFF_MINUTES.length },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results = [];
  for (const log of logs) {
    results.push(await processTelegramNotification(log, db));
  }
  return results;
}
