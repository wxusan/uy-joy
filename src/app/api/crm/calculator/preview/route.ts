import { NextRequest, NextResponse } from "next/server";
import { CalculatorPreviewSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { calculateDealFinancials, generatePaymentSchedule } from "@/lib/real-estate";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function POST(request: NextRequest) {
  const auth = await requirePlatformApiFeature("calculator", "viewDeals");
  if (auth.response) return auth.response;

  const body = await request.json();
  const parsed = CalculatorPreviewSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const financials = calculateDealFinancials(input);
  const startsAt = input.startDate ? new Date(input.startDate) : new Date();
  const paymentRows = generatePaymentSchedule({
    salePrice: financials.salePrice,
    initialPaymentAmount: financials.initialPaymentAmount,
    remainingAmount: financials.remainingAmount,
    termMonths: financials.paymentTermMonths,
    startsAt,
    customSchedule: input.customSchedule,
  });
  const validationMessages = [];
  if (financials.salePrice < 0) validationMessages.push("Sale price cannot be negative.");
  if (financials.initialPaymentAmount > financials.salePrice) validationMessages.push("Initial payment cannot exceed sale price.");
  if (financials.remainingAmount > 0 && financials.paymentTermMonths === 0 && !input.customSchedule?.length) {
    validationMessages.push("Term months or custom schedule is required for non-cash remaining amount.");
  }

  return NextResponse.json({ ...financials, paymentRows, validationMessages });
}
