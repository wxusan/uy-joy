/**
 * Internal tenant-lookup endpoint.
 * Called by middleware (Edge runtime) to resolve a custom domain → project id.
 * Only responds to requests that carry the internal sentinel header.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Only allow internal calls from our own middleware
  if (request.headers.get("x-internal-tenant-lookup") !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  try {
    const project = await prisma.project.findFirst({
      where: { domain },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ id: null }, { status: 200 });
    }

    return NextResponse.json({ id: project.id }, { status: 200 });
  } catch {
    return NextResponse.json({ id: null }, { status: 200 });
  }
}
