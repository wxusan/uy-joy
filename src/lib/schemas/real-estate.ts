import { z } from "zod";
import { DEAL_STATUSES, DOCUMENT_STATUSES, DOCUMENT_TYPES, PAYMENT_PLAN_TYPES, REFUND_STATUSES } from "@/lib/real-estate";

const IdString = z.string().trim().min(1).max(120);
const NullableId = IdString.nullable().optional();
const Money = z.number().finite().nonnegative();

export const DealStatusSchema = z.enum(DEAL_STATUSES);

export const DealCreateSchema = z.object({
  clientId: IdString,
  leadId: NullableId,
  projectId: NullableId,
  primaryUnitId: NullableId,
  assignedToId: NullableId,
  source: z.string().trim().max(80).nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
  displayCurrency: z.string().trim().length(3).default("USD"),
  paymentCurrency: z.string().trim().length(3).default("UZS"),
  exchangeRateToPaymentCurrency: z.number().positive().nullable().optional(),
  listPrice: Money.default(0),
  discountAmount: Money.nullable().optional(),
  discountPercent: z.number().finite().min(0).max(100).nullable().optional(),
  initialPaymentAmount: Money.nullable().optional(),
  initialPaymentPercent: z.number().finite().min(0).max(100).nullable().optional(),
  paymentTermMonths: z.number().int().min(0).max(360).default(0),
  expectedCloseAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const DealUpdateSchema = DealCreateSchema.partial().extend({
  status: DealStatusSchema.optional(),
  lostReason: z.string().trim().max(500).nullable().optional(),
  discountApproved: z.boolean().optional(),
});

export const DealReserveSchema = z.object({
  reservationExpiresAt: z.string().datetime().optional(),
  reservationHours: z.number().int().positive().max(720).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const DealExtendReservationSchema = z.object({
  reservationExpiresAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(500),
});

export const DealCancelSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  keepUnitReserved: z.boolean().default(false),
});

export const CalculatorPreviewSchema = z.object({
  unitId: NullableId,
  listPrice: Money,
  discountAmount: Money.nullable().optional(),
  discountPercent: z.number().finite().min(0).max(100).nullable().optional(),
  initialPaymentAmount: Money.nullable().optional(),
  initialPaymentPercent: z.number().finite().min(0).max(100).nullable().optional(),
  termMonths: z.number().int().min(0).max(360).default(0),
  startDate: z.string().datetime().optional(),
  customSchedule: z
    .array(
      z.object({
        sequence: z.number().int().positive().optional(),
        label: z.string().trim().max(120).optional(),
        dueDate: z.string(),
        amountType: z.enum(["fixed", "percent"]),
        amount: Money.nullable().optional(),
        percentOfSalePrice: z.number().finite().min(0).max(100).nullable().optional(),
        currency: z.string().trim().length(3).optional(),
        kind: z.string().trim().max(40).optional(),
      })
    )
    .optional(),
});

export const PaymentPlanCreateSchema = CalculatorPreviewSchema.extend({
  name: z.string().trim().min(1).max(120).default("Payment plan"),
  type: z.enum(PAYMENT_PLAN_TYPES).default("installment"),
  notes: z.string().max(1000).nullable().optional(),
});

export const PaymentPlanUpdateSchema = PaymentPlanCreateSchema.partial().extend({
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});

export const PaymentUpdateSchema = z.object({
  paidAmount: Money.optional(),
  paidAmountPaymentCurrency: Money.nullable().optional(),
  status: z.enum(["scheduled", "partial", "paid", "overdue", "cancelled"]).optional(),
  paidAt: z.string().datetime().nullable().optional(),
  method: z.enum(["cash", "bank_transfer", "card", "other"]).nullable().optional(),
  receiptDocumentId: NullableId,
  notes: z.string().max(1000).nullable().optional(),
});

const DocumentBaseSchema = z.object({
  clientId: NullableId,
  leadId: NullableId,
  dealId: NullableId,
  unitId: NullableId,
  paymentId: NullableId,
  type: z.enum(DOCUMENT_TYPES),
  title: z.string().trim().min(1).max(180),
  fileUrl: z.string().trim().min(1).max(1000),
  fileName: z.string().trim().max(255).nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  mimeType: z.string().trim().max(120).nullable().optional(),
  status: z.enum(DOCUMENT_STATUSES).default("uploaded"),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const DocumentCreateSchema = DocumentBaseSchema
  .refine((value) => value.clientId || value.leadId || value.dealId || value.unitId || value.paymentId, {
    message: "Document must be linked to at least one record",
  });

export const DocumentUpdateSchema = DocumentBaseSchema.partial();

export const DocumentRejectSchema = z.object({
  rejectionReason: z.string().trim().min(1).max(500),
});

export const RefundUpdateSchema = z.object({
  status: z.enum(REFUND_STATUSES),
  notes: z.string().trim().max(1000).nullable().optional(),
});
