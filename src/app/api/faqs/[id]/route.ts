import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PUT update FAQ
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        questionUz: data.questionUz,
        questionEn: data.questionEn,
        questionRu: data.questionRu,
        answerUz: data.answerUz,
        answerEn: data.answerEn,
        answerRu: data.answerRu,
      },
    });

    return NextResponse.json(faq);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE FAQ
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.fAQ.delete({
      where: { id },
    });

    // Reorder remaining FAQs
    const remaining = await prisma.fAQ.findMany({
      orderBy: { sortOrder: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.fAQ.update({
        where: { id: remaining[i].id },
        data: { sortOrder: i },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
