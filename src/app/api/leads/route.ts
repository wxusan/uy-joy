import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List all leads (admin only)
export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, projectId, projectName, unitId, unitNumber } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        projectId: projectId || null,
        projectName: projectName || null,
        unitId: unitId || null,
        unitNumber: unitNumber || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
