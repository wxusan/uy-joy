import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";
import { createActivity } from "./crm";
import { normalizeLeadStatus } from "./lead-status";
import { normalizePlatformRole, roleHasPlatformPermission } from "./platform-plans";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEAL_STATUSES = [
  "draft",
  "reserved",
  "contract_preparation",
  "contract_signed",
  "payment_active",
  "sold",
  "cancelled",
  "lost",
] as const;

export const PAYMENT_PLAN_TYPES = ["installment", "mortgage", "cash", "custom"] as const;
export const PAYMENT_STATUSES = ["scheduled", "partial", "paid", "overdue", "cancelled"] as const;
export const REFUND_STATUSES = ["requested", "approved", "paid", "rejected"] as const;
export const DOCUMENT_STATUSES = ["missing", "uploaded", "needs_review", "approved", "rejected", "expired"] as const;
export const DOCUMENT_TYPES = [
  "passport",
  "id_card",
  "contract",
  "reservation_agreement",
  "payment_receipt",
  "bank_document",
  "power_of_attorney",
  "other",
] as const;

export const DEFAULT_RESERVATION_HOURS = 48;
export const DISCOUNT_APPROVAL_THRESHOLD_PERCENT = Number(process.env.CLIENT_DISCOUNT_APPROVAL_THRESHOLD_PERCENT || 7);

export type RealEstateUser = { id?: string; role?: string };

export type ScheduleInput = {
  sequence?: number;
  label?: string;
  dueDate: string | Date;
  amountType: "fixed" | "percent";
  amount?: number | null;
  percentOfSalePrice?: number | null;
  currency?: string;
  kind?: string;
};

export function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculateDealFinancials(input: {
  listPrice: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  initialPaymentAmount?: number | null;
  initialPaymentPercent?: number | null;
  termMonths?: number | null;
}) {
  const listPrice = Math.max(0, input.listPrice || 0);
  let discountAmount = Math.max(0, input.discountAmount || 0);
  let discountPercent = Math.max(0, input.discountPercent || 0);

  if (discountAmount > 0) {
    discountAmount = Math.min(discountAmount, listPrice);
    discountPercent = listPrice > 0 ? (discountAmount / listPrice) * 100 : 0;
  } else if (discountPercent > 0) {
    discountPercent = Math.min(discountPercent, 100);
    discountAmount = (listPrice * discountPercent) / 100;
  }

  const salePrice = roundMoney(Math.max(0, listPrice - discountAmount));
  let initialPaymentAmount = Math.max(0, input.initialPaymentAmount || 0);
  let initialPaymentPercent = Math.max(0, input.initialPaymentPercent || 0);
  if (initialPaymentAmount > 0) {
    initialPaymentAmount = Math.min(initialPaymentAmount, salePrice);
    initialPaymentPercent = salePrice > 0 ? (initialPaymentAmount / salePrice) * 100 : 0;
  } else if (initialPaymentPercent > 0) {
    initialPaymentPercent = Math.min(initialPaymentPercent, 100);
    initialPaymentAmount = (salePrice * initialPaymentPercent) / 100;
  }

  initialPaymentAmount = roundMoney(initialPaymentAmount);
  const remainingAmount = roundMoney(Math.max(0, salePrice - initialPaymentAmount));
  const paymentTermMonths = Math.max(0, Math.floor(input.termMonths || 0));
  const monthlyPaymentAmount = paymentTermMonths > 0 ? roundMoney(remainingAmount / paymentTermMonths) : 0;

  return {
    listPrice: roundMoney(listPrice),
    discountAmount: roundMoney(discountAmount),
    discountPercent: roundMoney(discountPercent),
    salePrice,
    initialPaymentAmount,
    initialPaymentPercent: roundMoney(initialPaymentPercent),
    remainingAmount,
    paymentTermMonths,
    monthlyPaymentAmount,
    discountRequiresApproval: discountPercent > DISCOUNT_APPROVAL_THRESHOLD_PERCENT,
  };
}

function addMonthsClamped(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export function generatePaymentSchedule(input: {
  salePrice: number;
  initialPaymentAmount: number;
  remainingAmount: number;
  termMonths: number;
  startsAt: Date;
  currency?: string;
  customSchedule?: ScheduleInput[] | null;
}) {
  const currency = input.currency || "USD";
  if (input.customSchedule?.length) {
    return input.customSchedule.map((row, index) => {
      const expectedAmount =
        row.amountType === "percent"
          ? roundMoney((input.salePrice * (row.percentOfSalePrice || 0)) / 100)
          : roundMoney(row.amount || 0);
      return {
        sequence: row.sequence || index + 1,
        label: row.label || `Payment ${index + 1}`,
        dueDate: new Date(row.dueDate),
        expectedAmount,
        currency: row.currency || currency,
        kind: row.kind || "custom",
      };
    });
  }

  const rows = [];
  if (input.initialPaymentAmount > 0) {
    rows.push({
      sequence: 1,
      label: "Initial payment",
      dueDate: input.startsAt,
      expectedAmount: roundMoney(input.initialPaymentAmount),
      currency,
      kind: "initial",
    });
  }

  if (input.termMonths > 0 && input.remainingAmount > 0) {
    const monthly = roundMoney(input.remainingAmount / input.termMonths);
    let allocated = 0;
    for (let month = 1; month <= input.termMonths; month += 1) {
      const isLast = month === input.termMonths;
      const expectedAmount = isLast ? roundMoney(input.remainingAmount - allocated) : monthly;
      allocated = roundMoney(allocated + expectedAmount);
      rows.push({
        sequence: rows.length + 1,
        label: `Installment ${month}`,
        dueDate: addMonthsClamped(input.startsAt, month),
        expectedAmount,
        currency,
        kind: "installment",
      });
    }
  }

  return rows;
}

export async function nextDealNumber(db: Db = prisma) {
  const count = await db.deal.count();
  return `D-${String(count + 1).padStart(6, "0")}`;
}

export function dealVisibilityWhere(user: RealEstateUser | null | undefined): Prisma.DealWhereInput {
  if (!user) return { id: "__none__" };
  const role = normalizePlatformRole(user.role);
  if (role === "owner" || role === "admin" || role === "developer" || role === "sales_director") return {};
  if (role === "sales_agent" && user.id) return { assignedToId: user.id };
  if (role === "back_office") return {};
  return { id: "__none__" };
}

export function canReserveDeal(user: RealEstateUser | null | undefined, deal: { assignedToId?: string | null }) {
  if (!user) return false;
  if (roleHasPlatformPermission(user.role, "manageInventory")) return true;
  return normalizePlatformRole(user.role) === "sales_agent" && Boolean(user.id) && deal.assignedToId === user.id;
}

export function canMarkDealSold(user: RealEstateUser | null | undefined) {
  const role = normalizePlatformRole(user?.role);
  return role === "owner" || role === "admin" || role === "developer" || role === "sales_director";
}

export function canOverrideReservedDealSold(user: RealEstateUser | null | undefined) {
  const role = normalizePlatformRole(user?.role);
  return role === "owner" || role === "admin" || role === "developer";
}

export function discountReviewPatch(input: {
  discountRequiresApproval: boolean;
  existingFlaggedAt?: Date | null;
  discountTermsChanged: boolean;
  approved?: boolean;
  approvedById?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const patch: {
    discountFlaggedAt?: Date | null;
    discountApprovedById?: string | null;
    discountApprovedAt?: Date | null;
  } = {};

  if (input.discountTermsChanged) {
    patch.discountFlaggedAt = input.discountRequiresApproval ? input.existingFlaggedAt || now : null;
    patch.discountApprovedById = null;
    patch.discountApprovedAt = null;
  }

  if (input.approved && input.discountRequiresApproval) {
    patch.discountFlaggedAt = input.existingFlaggedAt || patch.discountFlaggedAt || now;
    patch.discountApprovedById = input.approvedById || null;
    patch.discountApprovedAt = now;
  }

  return patch;
}

export function canManagePayments(user: RealEstateUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "managePayments");
}

export function canManageDocuments(user: RealEstateUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "manageDocuments");
}

export function paymentStatusFromAmounts(expectedAmount: number, paidAmount: number, currentStatus = "scheduled") {
  if (currentStatus === "cancelled") return "cancelled";
  if (paidAmount <= 0) return "scheduled";
  if (paidAmount < expectedAmount) return "partial";
  return "paid";
}

export async function syncLeadStageForDeal(
  leadId: string | null | undefined,
  status: "reserved" | "sold",
  actorId: string | null,
  db: Db = prisma
) {
  if (!leadId) return;
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  const nextStatus = normalizeLeadStatus(status);
  await db.lead.update({
    where: { id: leadId },
    data: {
      status: nextStatus,
      stageEnteredAt: new Date(),
      ...(status === "sold" ? { convertedAt: new Date(), closedAt: new Date() } : {}),
    },
  });
  await createActivity(
    {
      type: "status_changed",
      title: `Lead moved to ${nextStatus} from deal workflow`,
      clientId: lead.clientId,
      leadId,
      actorId,
      metadata: { source: "deal", toStatus: nextStatus },
    },
    db
  );
}
