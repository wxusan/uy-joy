import {
  LEAD_STATUS_LABEL_KEYS,
  LEGACY_LEAD_STATUS_LABEL_KEYS,
} from "./lead-status";
import { PLATFORM_ROLE_LABEL_KEYS, normalizePlatformRole, type PlatformRole } from "./platform-plans";
import type {
  DealStatus,
  DocumentStatus,
  DocumentType,
  PaymentPlanType,
  PaymentStatus,
  RefundStatus,
} from "./real-estate";

export type CrmTranslator = (key: string) => string;

const ALL_LEAD_STATUS_LABEL_KEYS: Record<string, string> = {
  ...LEAD_STATUS_LABEL_KEYS,
  ...LEGACY_LEAD_STATUS_LABEL_KEYS,
};

const LEAD_STATUS_TEXT_UZ: Record<string, string> = {
  new: "Yangi lid",
  contacted: "Bog'lanildi",
  meeting: "Ofisga keladi",
  negotiation: "Muzokarada",
  reserved: "Bron qilingan",
  sold: "Sotildi",
  lost: "Yo'qotildi",
  inCRM: "CRMda",
  callback: "Qayta aloqa",
  inProgress: "Jarayonda",
  converted: "Sotildi",
  notInterested: "Qiziqmadi",
  closed: "Yopildi",
};

export const DEAL_STATUS_LABEL_KEYS_UI: Record<DealStatus, string> = {
  draft: "draft",
  reserved: "reserved",
  contract_preparation: "contractPreparation",
  contract_signed: "contractSigned",
  payment_active: "paymentActive",
  sold: "sold",
  cancelled: "cancelled",
  lost: "dealLost",
};

export const UNIT_STATUS_LABEL_KEYS: Record<string, string> = {
  available: "available",
  reserved: "reserved",
  sold: "sold",
};

export const CLIENT_STATUS_LABEL_KEYS: Record<string, string> = {
  active: "clientActive",
  inactive: "clientInactive",
};

export const TASK_STATUS_LABEL_KEYS: Record<string, string> = {
  open: "taskOpen",
  completed: "taskCompleted",
  cancelled: "taskCancelled",
};

export const TASK_PRIORITY_LABEL_KEYS: Record<string, string> = {
  low: "priorityLow",
  normal: "priorityNormal",
  high: "priorityHigh",
  urgent: "priorityUrgent",
};

export const TASK_TYPE_LABEL_KEYS: Record<string, string> = {
  call: "taskTypeCall",
  message: "taskTypeMessage",
  sms: "taskTypeSms",
  telegram: "taskTypeTelegram",
  meeting: "taskTypeMeeting",
  visit: "taskTypeVisit",
  note: "taskTypeNote",
  other: "taskTypeOther",
};

export const ACTIVITY_TYPE_LABEL_KEYS: Record<string, string> = {
  communication: "activityTypeCommunication",
  meeting: "activityTypeMeeting",
  visit: "activityTypeVisit",
  note: "activityTypeNote",
  system: "activityTypeSystem",
};

const LEAD_SOURCE_LABELS_UI: Record<string, Record<"uz" | "ru" | "en", string>> = {
  public_page: { uz: "Ommaviy sahifa", ru: "Публичная страница", en: "Public page" },
  contact_form: { uz: "Aloqa formasi", ru: "Форма контакта", en: "Contact form" },
  apartment_page: { uz: "Xonadon sahifasi", ru: "Страница квартиры", en: "Apartment page" },
  visual_explorer: { uz: "Vizual tanlov", ru: "Визуальный выбор", en: "Visual explorer" },
  floating_contact: { uz: "Tez aloqa", ru: "Быстрый контакт", en: "Floating contact" },
  waitlist: { uz: "Kutish ro'yxati", ru: "Лист ожидания", en: "Waitlist" },
  telegram: { uz: "Telegram", ru: "Telegram", en: "Telegram" },
  instagram: { uz: "Instagram", ru: "Instagram", en: "Instagram" },
  campaign: { uz: "Kampaniya", ru: "Кампания", en: "Campaign" },
  client_site: { uz: "Mijoz sayti", ru: "Сайт клиента", en: "Client site" },
  manual: { uz: "Qo'lda", ru: "Вручную", en: "Manual" },
  walk_in: { uz: "Ofisga kelgan", ru: "Пришел в офис", en: "Walk-in" },
  phone_call: { uz: "Qo'ng'iroq", ru: "Звонок", en: "Phone call" },
};

export const PAYMENT_PLAN_STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "draft",
  active: "paymentPlanActive",
  completed: "paymentPlanCompleted",
  cancelled: "cancelled",
};

export const PAYMENT_PLAN_TYPE_LABEL_KEYS_UI: Record<PaymentPlanType, string> = {
  installment: "paymentPlanTypeInstallment",
  mortgage: "paymentPlanTypeMortgage",
  cash: "paymentPlanTypeCash",
  custom: "paymentPlanTypeCustom",
};

export const PAYMENT_STATUS_LABEL_KEYS_UI: Record<PaymentStatus, string> = {
  scheduled: "paymentScheduled",
  partial: "paymentPartial",
  paid: "paymentPaid",
  overdue: "overdue",
  cancelled: "cancelled",
};

export const DOCUMENT_STATUS_LABEL_KEYS_UI: Record<DocumentStatus, string> = {
  missing: "documentMissing",
  uploaded: "documentUploaded",
  needs_review: "documentNeedsReview",
  approved: "approved",
  rejected: "rejected",
  expired: "documentExpired",
};

export const DOCUMENT_TYPE_LABEL_KEYS_UI: Record<DocumentType, string> = {
  passport: "documentTypePassport",
  id_card: "documentTypeIdCard",
  contract: "documentTypeContract",
  reservation_agreement: "documentTypeReservationAgreement",
  payment_receipt: "documentTypePaymentReceipt",
  bank_document: "documentTypeBankDocument",
  power_of_attorney: "documentTypePowerOfAttorney",
  other: "documentTypeOther",
};

export const REFUND_STATUS_LABEL_KEYS_UI: Record<RefundStatus, string> = {
  requested: "refundRequested",
  approved: "approved",
  paid: "paymentPaid",
  rejected: "rejected",
};

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  "passport",
  "contract",
  "reservation_agreement",
  "payment_receipt",
  "bank_document",
  "other",
];

function humanizeValue(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocale(locale: string | null | undefined): "uz" | "ru" | "en" {
  return locale === "ru" || locale === "en" ? locale : "uz";
}

function labelFromMap(
  t: CrmTranslator,
  map: Record<string, string>,
  value: string | null | undefined,
  emptyLabel = "—"
) {
  if (!value) return emptyLabel;
  const key = map[value];
  return key ? t(key) : humanizeValue(value);
}

export function leadStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, ALL_LEAD_STATUS_LABEL_KEYS, status, emptyLabel);
}

export function leadStatusTextUz(status: string | null | undefined, emptyLabel = "—") {
  if (!status) return emptyLabel;
  return LEAD_STATUS_TEXT_UZ[status] || humanizeValue(status);
}

export function pipelineStageLabel(t: CrmTranslator, stage: { key: string; name?: string | null }) {
  const key = ALL_LEAD_STATUS_LABEL_KEYS[stage.key];
  if (key) return t(key);
  return stage.name || humanizeValue(stage.key);
}

export function dealStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, DEAL_STATUS_LABEL_KEYS_UI, status, emptyLabel);
}

export function unitStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, UNIT_STATUS_LABEL_KEYS, status, emptyLabel);
}

export function clientStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, CLIENT_STATUS_LABEL_KEYS, status, emptyLabel);
}

export function taskStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, TASK_STATUS_LABEL_KEYS, status, emptyLabel);
}

export function taskPriorityLabel(t: CrmTranslator, priority: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, TASK_PRIORITY_LABEL_KEYS, priority, emptyLabel);
}

export function taskTypeLabel(t: CrmTranslator, type: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, TASK_TYPE_LABEL_KEYS, type, emptyLabel);
}

export function activityTypeLabel(t: CrmTranslator, type: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, ACTIVITY_TYPE_LABEL_KEYS, type, emptyLabel);
}

export function leadSourceLabelUi(source: string | null | undefined, locale: string | null | undefined = "uz", emptyLabel = "—") {
  if (!source) return emptyLabel;
  const normalized = source.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  const labels = LEAD_SOURCE_LABELS_UI[normalized] || LEAD_SOURCE_LABELS_UI[source];
  if (labels) return labels[normalizeLocale(locale)] || labels.uz || labels.en;
  return humanizeValue(source);
}

export const leadSourceLabel = leadSourceLabelUi;

export function paymentPlanStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, PAYMENT_PLAN_STATUS_LABEL_KEYS, status, emptyLabel);
}

export function paymentPlanTypeLabel(t: CrmTranslator, type: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, PAYMENT_PLAN_TYPE_LABEL_KEYS_UI, type, emptyLabel);
}

export function paymentStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, PAYMENT_STATUS_LABEL_KEYS_UI, status, emptyLabel);
}

export function documentStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, DOCUMENT_STATUS_LABEL_KEYS_UI, status, emptyLabel);
}

export function documentTypeLabel(t: CrmTranslator, type: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, DOCUMENT_TYPE_LABEL_KEYS_UI, type, emptyLabel);
}

export function refundStatusLabel(t: CrmTranslator, status: string | null | undefined, emptyLabel = "—") {
  return labelFromMap(t, REFUND_STATUS_LABEL_KEYS_UI, status, emptyLabel);
}

export function platformRoleLabel(t: CrmTranslator, role: string | null | undefined, emptyLabel = "user") {
  const normalized = normalizePlatformRole(role);
  if (!normalized) return role ? humanizeValue(role) : emptyLabel;
  return t(PLATFORM_ROLE_LABEL_KEYS[normalized as PlatformRole]);
}
