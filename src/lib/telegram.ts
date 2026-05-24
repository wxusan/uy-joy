import { Prisma, PrismaClient, TelegramNotificationLog } from "@prisma/client";
import prisma from "./prisma";
import { leadSourceLabel } from "./lead-sources";
import { captureServerEvent } from "./server-analytics";

type Db = PrismaClient | Prisma.TransactionClient;

const TELEGRAM_RETRY_BACKOFF_MINUTES = [1, 5, 15] as const;
const TELEGRAM_ALERT_SCAN_LIMIT = 50;

type TelegramLocale = "uz" | "ru" | "en";
type TelegramAlertType =
  | "lead_assigned"
  | "lead_duplicate_detected"
  | "followup_overdue"
  | "reservation_created"
  | "reservation_expiring"
  | "reservation_expired"
  | "payment_overdue"
  | "manager_inactive";

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

type TelegramAlertPayload = {
  type: TelegramAlertType;
  leadId: string | null | undefined;
  clientId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  managerName?: string | null;
  dealNumber?: string | null;
  unitLabel?: string | null;
  taskTitle?: string | null;
  dueAt?: Date | string | null;
  expiresAt?: Date | string | null;
  paymentLabel?: string | null;
  activeLeadsCount?: number | null;
  crmPath?: string | null;
  ref?: string | null;
  locale?: string | null;
  chatId?: string | null;
  nextAttemptAt?: Date | null;
};

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function normalizeLocale(locale: string | null | undefined): TelegramLocale {
  return locale === "ru" || locale === "en" ? locale : "uz";
}

function alertChatId(type: TelegramAlertType, explicitChatId?: string | null) {
  if (explicitChatId) return explicitChatId;
  if (type === "payment_overdue") return process.env.TELEGRAM_FINANCE_CHAT_ID || null;
  if (type === "reservation_expiring" || type === "reservation_expired" || type === "manager_inactive") {
    return process.env.TELEGRAM_DIRECTOR_CHAT_ID || process.env.TELEGRAM_SALES_CHAT_ID || process.env.TELEGRAM_CHAT_ID || null;
  }
  return process.env.TELEGRAM_SALES_CHAT_ID || process.env.TELEGRAM_CHAT_ID || null;
}

function formatTashkentDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function crmUrl(path: string | null | undefined, baseUrl?: string | null) {
  if (!path || !baseUrl) return null;
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function joinTelegramLines(lines: Array<string | null | undefined>) {
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

function telegramDictionary(locale: string | null | undefined) {
  const dictionaries = {
    uz: {
      newLead: "Yangi lid",
      leadAssigned: "Lid menejerga biriktirildi",
      leadDuplicateDetected: "Dublikat lid topildi",
      overdueFollowup: "Qayta aloqa kechikdi",
      reservationCreated: "Bron ochildi",
      reservationExpiring: "Bron tugayapti",
      reservationExpired: "Bron muddati tugadi",
      paymentOverdue: "To'lov kechikdi",
      client: "Klient",
      phone: "Telefon",
      source: "Manba",
      project: "Loyiha",
      unit: "Xonadon",
      language: "Til",
      campaign: "Kampaniya",
      time: "Vaqt",
      manager: "Menejer",
      task: "Vazifa",
      due: "Muddat",
      expires: "Tugash vaqti",
      deal: "Bitim",
      payment: "To'lov",
      crm: "CRM",
      review: "CRMda ko'ring",
      noData: "-",
      managerInactive: "Menejer faolsiz",
      activeLeads: "Faol lidlar",
      lastContact: "Oxirgi aloqa",
      neverContacted: "Hech qachon aloqa bo'lmagan",
    },
    ru: {
      newLead: "Новый лид",
      leadAssigned: "Лид назначен менеджеру",
      leadDuplicateDetected: "Найден дубликат лида",
      overdueFollowup: "Просрочена повторная связь",
      reservationCreated: "Бронь создана",
      reservationExpiring: "Бронь скоро истекает",
      reservationExpired: "Срок брони истек",
      paymentOverdue: "Платеж просрочен",
      client: "Клиент",
      phone: "Телефон",
      source: "Источник",
      project: "Проект",
      unit: "Квартира",
      language: "Язык",
      campaign: "Кампания",
      time: "Время",
      manager: "Менеджер",
      task: "Задача",
      due: "Срок",
      expires: "Истекает",
      deal: "Сделка",
      payment: "Платеж",
      crm: "CRM",
      review: "Откройте в CRM",
      noData: "-",
      managerInactive: "Менеджер неактивен",
      activeLeads: "Активные лиды",
      lastContact: "Последний контакт",
      neverContacted: "Контакт отсутствует",
    },
    en: {
      newLead: "New lead",
      leadAssigned: "Lead assigned",
      leadDuplicateDetected: "Duplicate lead detected",
      overdueFollowup: "Follow-up overdue",
      reservationCreated: "Reservation created",
      reservationExpiring: "Reservation expiring",
      reservationExpired: "Reservation expired",
      paymentOverdue: "Payment overdue",
      client: "Client",
      phone: "Phone",
      source: "Source",
      project: "Project",
      unit: "Unit",
      language: "Language",
      campaign: "Campaign",
      time: "Time",
      manager: "Manager",
      task: "Task",
      due: "Due",
      expires: "Expires",
      deal: "Deal",
      payment: "Payment",
      crm: "CRM",
      review: "Open in CRM",
      noData: "-",
      managerInactive: "Manager inactive",
      activeLeads: "Active leads",
      lastContact: "Last contact",
      neverContacted: "Never contacted",
    },
  };
  return dictionaries[normalizeLocale(locale)];
}

export function buildLeadTelegramMessage(
  lead: LeadTelegramPayload,
  options: { crmEnabled?: boolean; crmBaseUrl?: string | null; locale?: string } = {}
) {
  const d = telegramDictionary(options.locale || lead.preferredLanguage);
  const crmLink =
    options.crmEnabled && options.crmBaseUrl
      ? `${options.crmBaseUrl.replace(/\/$/, "")}/portal/management-x7k9/crm/leads/${lead.id}`
      : null;
  return joinTelegramLines([
    d.newLead,
    "",
    `${d.client}: ${lead.name}`,
    `${d.phone}: ${lead.phone}`,
    `${d.source}: ${leadSourceLabel(lead.source, options.locale || lead.preferredLanguage || "uz")}`,
    `${d.project}: ${lead.projectName || d.noData}`,
    `${d.unit}: ${lead.unitLabel || d.noData}`,
    `${d.language}: ${lead.preferredLanguage || d.noData}`,
    `${d.campaign}: ${lead.utmCampaign || d.noData}`,
    `${d.time}: ${formatTashkentDate(lead.createdAt)}`,
    crmLink ? "" : null,
    crmLink ? `${d.crm}: ${crmLink}` : null,
  ]);
}

export function buildTelegramAlertMessage(input: TelegramAlertPayload, options: { crmBaseUrl?: string | null } = {}) {
  const d = telegramDictionary(input.locale);
  const titles: Record<TelegramAlertType, string> = {
    lead_assigned: d.leadAssigned,
    lead_duplicate_detected: d.leadDuplicateDetected,
    followup_overdue: d.overdueFollowup,
    reservation_created: d.reservationCreated,
    reservation_expiring: d.reservationExpiring,
    reservation_expired: d.reservationExpired,
    payment_overdue: d.paymentOverdue,
    manager_inactive: d.managerInactive,
  };
  const link = crmUrl(input.crmPath, options.crmBaseUrl);
  const isPaymentAlert = input.type === "payment_overdue";
  const isInactivityAlert = input.type === "manager_inactive";
  return joinTelegramLines([
    titles[input.type],
    "",
    input.clientName && !isPaymentAlert && !isInactivityAlert ? `${d.client}: ${input.clientName}` : null,
    input.clientPhone && !isPaymentAlert && !isInactivityAlert ? `${d.phone}: ${input.clientPhone}` : null,
    input.managerName ? `${d.manager}: ${input.managerName}` : null,
    isInactivityAlert && input.activeLeadsCount != null ? `${d.activeLeads}: ${input.activeLeadsCount}` : null,
    isInactivityAlert ? (input.dueAt ? `${d.lastContact}: ${formatTashkentDate(input.dueAt)}` : `${d.lastContact}: ${d.neverContacted}`) : null,
    !isInactivityAlert && input.dealNumber ? `${d.deal}: ${input.dealNumber}` : null,
    input.unitLabel ? `${d.unit}: ${input.unitLabel}` : null,
    input.taskTitle ? `${d.task}: ${input.taskTitle}` : null,
    input.paymentLabel ? `${d.payment}: ${input.paymentLabel}` : null,
    !isInactivityAlert && input.dueAt ? `${d.due}: ${formatTashkentDate(input.dueAt)}` : null,
    input.expiresAt ? `${d.expires}: ${formatTashkentDate(input.expiresAt)}` : null,
    link ? "" : null,
    link ? `${d.review}: ${link}` : null,
    input.ref ? `Ref: ${input.ref}` : null,
  ]);
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

export async function createTelegramAlertLog(
  input: TelegramAlertPayload,
  options: { crmBaseUrl?: string | null; dedupe?: boolean } = {},
  db: Db = prisma
) {
  if (!input.leadId) return null;
  const chatId = alertChatId(input.type, input.chatId);
  if (!chatId) return null;
  if (options.dedupe !== false && input.ref) {
    const existing = await db.telegramNotificationLog.findFirst({
      where: {
        ref: input.ref,
        status: { in: ["pending", "sent", "failed", "acknowledged"] },
      },
      select: { id: true },
    });
    if (existing) return null;
  }
  return db.telegramNotificationLog.create({
    data: {
      leadId: input.leadId,
      clientId: input.clientId || null,
      chatId,
      status: "pending",
      messageText: buildTelegramAlertMessage(input, options),
      ref: input.ref || null,
      attemptCount: 0,
      nextAttemptAt: input.nextAttemptAt || new Date(),
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
  if (db === prisma) await enqueueOperationalTelegramAlerts(now, db);
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

export async function enqueueOperationalTelegramAlerts(now = new Date(), db: Db = prisma) {
  const crmBaseUrl = process.env.NEXTAUTH_URL || null;
  const expiringBy = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [overdueTasks, expiringDeals, overduePayments] = await Promise.all([
    db.task.findMany({
      where: { status: "open", dueAt: { lt: now }, leadId: { not: null } },
      include: {
        lead: { select: { id: true, name: true, phone: true, clientId: true, preferredLanguage: true } },
        assignedTo: { select: { name: true, email: true } },
      },
      orderBy: { dueAt: "asc" },
      take: TELEGRAM_ALERT_SCAN_LIMIT,
    }),
    db.deal.findMany({
      where: { status: "reserved", reservationExpiresAt: { gte: now, lte: expiringBy }, leadId: { not: null } },
      include: {
        client: { select: { fullName: true, phone: true } },
        lead: { select: { id: true, preferredLanguage: true } },
        assignedTo: { select: { name: true, email: true } },
        primaryUnit: { include: { floor: { include: { building: true } } } },
      },
      orderBy: { reservationExpiresAt: "asc" },
      take: TELEGRAM_ALERT_SCAN_LIMIT,
    }),
    process.env.TELEGRAM_FINANCE_CHAT_ID
      ? db.payment.findMany({
          where: {
            dueDate: { lt: now },
            status: "overdue",
            deal: { leadId: { not: null } },
          },
          include: { deal: { select: { id: true, dealNumber: true, leadId: true } } },
          orderBy: { dueDate: "asc" },
          take: TELEGRAM_ALERT_SCAN_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  for (const task of overdueTasks) {
    await createTelegramAlertLog(
      {
        type: "followup_overdue",
        leadId: task.leadId,
        clientId: task.lead?.clientId,
        clientName: task.lead?.name,
        clientPhone: task.lead?.phone,
        managerName: task.assignedTo?.name || task.assignedTo?.email,
        taskTitle: task.title,
        dueAt: task.dueAt,
        crmPath: `/portal/management-x7k9/crm/leads/${task.leadId}`,
        locale: task.lead?.preferredLanguage,
        ref: `followup_${task.id}_${task.dueAt?.toISOString() ?? "no-due"}`,
      },
      { crmBaseUrl },
      db
    );
  }

  for (const deal of expiringDeals) {
    await createTelegramAlertLog(
      {
        type: "reservation_expiring",
        leadId: deal.leadId,
        clientId: deal.clientId,
        clientName: deal.client.fullName,
        clientPhone: deal.client.phone,
        managerName: deal.assignedTo?.name || deal.assignedTo?.email,
        dealNumber: deal.dealNumber,
        unitLabel: deal.primaryUnit ? `${deal.primaryUnit.floor.building.name} / ${deal.primaryUnit.unitNumber}` : null,
        expiresAt: deal.reservationExpiresAt,
        crmPath: `/portal/management-x7k9/crm/deals/${deal.id}`,
        locale: deal.lead?.preferredLanguage,
        ref: `reservation_expiring_${deal.id}_${deal.reservationExpiresAt?.toISOString()}`,
      },
      { crmBaseUrl },
      db
    );
  }

  for (const payment of overduePayments) {
    await createTelegramAlertLog(
      {
        type: "payment_overdue",
        leadId: payment.deal.leadId,
        clientId: payment.clientId,
        dealNumber: payment.deal.dealNumber,
        paymentLabel: payment.label,
        dueAt: payment.dueDate,
        crmPath: `/portal/management-x7k9/crm/deals/${payment.dealId}`,
        chatId: process.env.TELEGRAM_FINANCE_CHAT_ID || null,
        ref: `payment_overdue_${payment.id}`,
      },
      { crmBaseUrl },
      db
    );
  }
}
