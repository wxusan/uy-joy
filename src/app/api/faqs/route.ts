import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { FAQCreateSchema } from "@/lib/schemas/faq";
import { invalidInput } from "@/lib/schemas/common";

// GET all FAQs
export async function GET() {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST new FAQ
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = FAQCreateSchema.safeParse(data);
    if (!parsed.success) return invalidInput(parsed.error);
    const input = parsed.data;
    
    // Get current count for sortOrder
    const count = await prisma.fAQ.count();

    const faq = await prisma.fAQ.create({
      data: {
        questionUz: input.questionUz,
        questionEn: input.questionEn,
        questionRu: input.questionRu,
        answerUz: input.answerUz,
        answerEn: input.answerEn,
        answerRu: input.answerRu,
        sortOrder: count,
      },
    });

    revalidateTag("faqs");
    return NextResponse.json(faq);
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
