import prisma from "@/lib/prisma";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

const LIMIT = 20;

export default async function LeadsPage() {
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      skip: 0,
    }),
    prisma.lead.count(),
  ]);

  const serialized = leads.map((l) => ({
    ...l,
    nextFollowUp: l.nextFollowUp ? l.nextFollowUp.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <LeadsClient
      initialLeads={serialized}
      initialTotal={total}
      initialPages={Math.ceil(total / LIMIT)}
    />
  );
}
