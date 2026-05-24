import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dealStatusLabel, paymentStatusLabel } from "@/lib/crm-labels";
import { dealVisibilityWhere } from "@/lib/real-estate";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getTranslations } from "next-intl/server";
import ReservationCountdown from "@/components/crm/ReservationCountdown";

export const dynamic = "force-dynamic";

export default async function DealsPage({ searchParams }: { searchParams: { status?: string; expiring?: string } }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewDeals);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "deals")) return null;
  const t = await getTranslations("admin");
  const user = session.user as { id?: string; role?: string };
  const now = new Date();
  const expiringBy = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const where = {
    AND: [
      dealVisibilityWhere(user),
      searchParams.status ? { status: searchParams.status } : {},
      searchParams.expiring === "true" ? { reservationExpiresAt: { gte: now, lte: expiringBy } } : {},
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
        <h1 className="a-page-title">{t("deals")}</h1>
        <p className="a-page-sub">{t("dealsSubtitle")}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["", "draft", "reserved", "payment_active", "sold", "cancelled"].map((status) => (
          <Link key={status || "all"} href={status ? `/portal/management-x7k9/crm/deals?status=${status}` : "/portal/management-x7k9/crm/deals"} className="a-btn">
            {dealStatusLabel(t, status, t("all"))}
          </Link>
        ))}
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[980px]">
          <thead>
            <tr>
              <th>{t("deal")}</th>
              <th>{t("client")}</th>
              <th>{t("unit")}</th>
              <th>{t("status")}</th>
              <th>{t("reservationExpiry")}</th>
              <th>{t("salePrice")}</th>
              <th>{t("assigned")}</th>
              <th>{t("nextPayment")}</th>
              <th style={{ textAlign: "right" }}>{t("created")}</th>
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
                <td>{deal.primaryUnit ? `${deal.primaryUnit.floor.building.name} / ${deal.primaryUnit.unitNumber}` : t("draft")}</td>
                <td>{dealStatusLabel(t, deal.status)}</td>
                <td>
                  {deal.status === "reserved" && deal.reservationExpiresAt ? (
                    <ReservationCountdown
                      compact
                      href={`/portal/management-x7k9/crm/deals/${deal.id}`}
                      status={deal.status}
                      expiresAt={deal.reservationExpiresAt.toISOString()}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{deal.salePrice.toLocaleString()} {deal.currency}</td>
                <td>{deal.assignedTo?.name || deal.assignedTo?.email || t("unassigned")}</td>
                <td>{deal.payments[0] ? `${deal.payments[0].label}: ${paymentStatusLabel(t, deal.payments[0].status)}` : "—"}</td>
                <td style={{ textAlign: "right" }}>{deal.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {deals.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10" style={{ color: "var(--a-text-tertiary)" }}>{t("noDealsYet")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
