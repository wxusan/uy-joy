import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDeploymentInfo } from "@/lib/deployment";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const deployment = getDeploymentInfo();
  return NextResponse.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      clientSlug: deployment.clientSlug,
      plan: deployment.plan,
      appVersion: deployment.appVersion,
      commitSha: deployment.commitSha,
      database,
      missingRequiredEnv: deployment.env.missingRequired,
    },
    { status: database === "ok" ? 200 : 503 }
  );
}

