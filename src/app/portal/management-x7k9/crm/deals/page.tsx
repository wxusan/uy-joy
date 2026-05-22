import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dealVisibilityWhere } from "@/lib/real-estate";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function DealsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewDeals);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "deals")) return null;
  const user = session.user as { id?: string; role?: string };
  const where = {
    AND: [
      dealVisibilityWhere(user),
      searchParams.status ? { status: searchParams.status } : {},
    ],
  };
  const deals = await prisma.deal.findMany({
    where,
    include: {
      client: { select: { fullName: true, phone: true } },
      primaryUnit: { include: { floor: { include: { building: true } } } },
      assignedTo: { select: { name: true, email: true } },
      payments: { orderBy: { dueDate: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">Deals</h1>
        <p className="a-page-sub">Reservations, sales, payment plans, documents, and finance status.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["", "draft", "reserved", "payment_active", "sold", "cancelled"].map((status) => (
          <Link key={status || "all"} href={status ? `/portal/management-x7k9/crm/deals?status=${status}` : "/portal/management-x7k9/crm/deals"} className="a-btn">
            {status || "all"}
          </Link>
        ))}
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[980px]">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Client</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Sale price</th>
              <th>Assigned</th>
              <th>Next payment</th>
              <th style={{ textAlign: "right" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>
                  <Link className="font-medium hover:underline" href={`/portal/management-x7k9/crm/deals/${deal.id}`}>
                    {deal.dealNumber}
                  </Link>
                </td>
                <td>{deal.client.fullName}<div className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>{deal.client.phone}</div></td>
                <td>{deal.primaryUnit ? `${deal.primaryUnit.floor.building.name} / ${deal.primaryUnit.unitNumber}` : "Draft"}</td>
                <td>{deal.status}</td>
                <td>{deal.salePrice.toLocaleString()} {deal.currency}</td>
                <td>{deal.assignedTo?.name || deal.assignedTo?.email || "Unassigned"}</td>
                <td>{deal.payments[0] ? `${deal.payments[0].label}: ${deal.payments[0].status}` : "—"}</td>
                <td style={{ textAlign: "right" }}>{deal.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {deals.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10" style={{ color: "var(--a-text-tertiary)" }}>No deals in this scope yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
