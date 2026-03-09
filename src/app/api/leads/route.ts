import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List leads with pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.lead.count(),
  ]);

  return NextResponse.json({
    data: leads,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// POST - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, projectId, projectName, unitId, unitNumber, source } = body;

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
        source: source || null,
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
