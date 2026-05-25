import { Prisma } from "@prisma/client";

export const ACTIVE_LEAD_STATUS_WHERE = { status: { notIn: ["sold", "lost"] } } satisfies Prisma.LeadWhereInput;
export const OPEN_DEAL_STATUSES = ["reserved", "payment_active", "contract_preparation", "contract_signed"] as const;
export const PAYMENT_RISK_STATUSES = ["scheduled", "partial", "overdue"] as const;

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function tashkentDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const start = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - TASHKENT_OFFSET_MS
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function unansweredLeadWhere(base: Prisma.LeadWhereInput = {}): Prisma.LeadWhereInput {
  return { AND: [base, ACTIVE_LEAD_STATUS_WHERE, { firstResponseAt: null }] };
}

export function overdueTaskWhere(now = new Date(), base: Prisma.TaskWhereInput = {}): Prisma.TaskWhereInput {
  return { AND: [base, { status: "open", dueAt: { lt: now } }] };
}

export function todayTaskWhere(now = new Date(), base: Prisma.TaskWhereInput = {}): Prisma.TaskWhereInput {
  const { start, end } = tashkentDayBounds(now);
  return { AND: [base, { status: "open", dueAt: { gte: start, lt: end } }] };
}

export function todayVisitTaskWhere(now = new Date(), base: Prisma.TaskWhereInput = {}): Prisma.TaskWhereInput {
  const { start, end } = tashkentDayBounds(now);
  return { AND: [base, { status: "open", type: { in: ["meeting", "visit"] }, dueAt: { gte: start, lt: end } }] };
}

export function expiringReservationWhere(now = new Date(), base: Prisma.DealWhereInput = {}): Prisma.DealWhereInput {
  return {
    AND: [
      base,
      { status: "reserved", reservationExpiresAt: { gte: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
    ],
  };
}

export function activeReservationWhere(base: Prisma.DealWhereInput = {}): Prisma.DealWhereInput {
  return { AND: [base, { status: "reserved" }] };
}

export function activeDealWhere(base: Prisma.DealWhereInput = {}): Prisma.DealWhereInput {
  return { AND: [base, { status: { in: [...OPEN_DEAL_STATUSES] } }] };
}

export function overduePaymentWhere(now = new Date(), base: Prisma.PaymentWhereInput = {}): Prisma.PaymentWhereInput {
  return { AND: [base, { status: { in: [...PAYMENT_RISK_STATUSES] }, dueDate: { lt: now } }] };
}
