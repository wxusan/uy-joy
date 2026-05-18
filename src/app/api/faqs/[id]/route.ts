import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { FAQUpdateSchema } from "@/lib/schemas/faq";
import { invalidInput } from "@/lib/schemas/common";

// PUT update FAQ
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const parsed = FAQUpdateSchema.safeParse(data);
    if (!parsed.success) return invalidInput(parsed.error);
    const input = parsed.data;

    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        ...input,
      },
    });

    revalidateTag("faqs");
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

    revalidateTag("faqs");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
