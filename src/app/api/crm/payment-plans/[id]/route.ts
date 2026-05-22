import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dealVisibilityWhere } from "@/lib/real-estate";
import { PaymentPlanUpdateSchema } from "@/lib/schemas/real-estate";
import { invalidInput } from "@/lib/schemas/common";
import { requirePlatformApiFeature } from "@/lib/platform-guards";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("paymentPlans", "manageDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = PaymentPlanUpdateSchema.safeParse(body);
  if (!parsed.success) return invalidInput(parsed.error);
  const input = parsed.data;
  const existing = await prisma.paymentPlan.findFirst({
    where: { id, deal: { is: dealVisibilityWhere(auth.user) } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (input.status === "active" || input.status === "completed") {
    return NextResponse.json(
      { error: "Use the dedicated activation/completion workflow for this payment plan status" },
      { status: 400 }
    );
  }
  const plan = await prisma.paymentPlan.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
    include: { payments: { orderBy: { sequence: "asc" } } },
  });
  return NextResponse.json(plan);
}

export const PUT = PATCH;
