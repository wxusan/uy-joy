/**
 * Internal tenant-lookup endpoint.
 * Called by middleware (Edge runtime) to resolve a custom domain → project id,
 * and optionally to fetch the project's embed allowed origins for CSP enforcement.
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

  const { searchParams } = request.nextUrl;
  const domain = searchParams.get("domain");
  const includeEmbed = searchParams.get("includeEmbed") === "1";

  // domain is required unless includeEmbed is set (embed-only lookup for default tenant)
  if (!domain && !includeEmbed) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  try {
    const where = domain ? { domain } : {};
    const project = await prisma.project.findFirst({
      where,
      select: {
        id: true,
        ...(includeEmbed && {
          publicPageConfig: { select: { embedAllowedOrigins: true } },
        }),
      },
      orderBy: { createdAt: "asc" },
    });

    const embedAllowedOrigins: string[] = includeEmbed
      ? ((project?.publicPageConfig?.embedAllowedOrigins as string[] | null) ?? [])
      : [];

    return NextResponse.json({
      id: project?.id ?? null,
      ...(includeEmbed && { embedAllowedOrigins }),
    });
  } catch {
    return NextResponse.json({ id: null, embedAllowedOrigins: [] }, { status: 200 });
  }
}
