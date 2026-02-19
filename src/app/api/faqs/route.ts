import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    
    // Get current count for sortOrder
    const count = await prisma.fAQ.count();

    const faq = await prisma.fAQ.create({
      data: {
        questionUz: data.questionUz,
        questionEn: data.questionEn,
        questionRu: data.questionRu,
        answerUz: data.answerUz,
        answerEn: data.answerEn,
        answerRu: data.answerRu,
        sortOrder: count,
      },
    });

    return NextResponse.json(faq);
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
