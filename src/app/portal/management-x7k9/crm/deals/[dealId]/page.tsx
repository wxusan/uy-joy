import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  dealStatusLabel,
  documentStatusLabel,
  documentTypeLabel,
  paymentPlanStatusLabel,
  paymentStatusLabel,
  unitStatusLabel,
} from "@/lib/crm-labels";
import { dealVisibilityWhere } from "@/lib/real-estate";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import DealActions from "./DealActions";
import DealFinanceActions from "./DealFinanceActions";
import PaymentPlanPdfButton from "./PaymentPlanPdfButton";
import ReservationCountdown from "@/components/crm/ReservationCountdown";

export const dynamic = "force-dynamic";

export default async function DealProfilePage({ params }: { params: Promise<{ dealId: string }> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewDeals);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "deals")) return null;
  const user = session.user as { id?: string; role?: string };
  const { dealId } = await params;
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id: dealId }, dealVisibilityWhere(user)] },
    include: {
      client: true,
      lead: true,
      primaryUnit: { include: { floor: { include: { building: { include: { project: true } } } } } },
      assignedTo: true,
      paymentPlans: { orderBy: { createdAt: "desc" }, include: { payments: { orderBy: { sequence: "asc" } } } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true, reviewedBy: true } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      activities: { orderBy: { occurredAt: "desc" }, take: 30 },
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) notFound();
  const t = await getTranslations("admin");
  const paidTotal = deal.paymentPlans.flatMap((plan) => plan.payments).reduce((sum, payment) => sum + payment.paidAmount, 0);
  const overdueTotal = deal.paymentPlans
    .flatMap((plan) => plan.payments)
    .filter((payment) => payment.status === "overdue")
    .reduce((sum, payment) => sum + Math.max(0, payment.expectedAmount - payment.paidAmount), 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{deal.dealNumber}</h1>
          <p className="a-page-sub">{deal.client.fullName} · {dealStatusLabel(t, deal.status)} · {deal.salePrice.toLocaleString()} {deal.currency}</p>
        </div>
        <Link href="/portal/management-x7k9/crm/deals" className="a-btn">{t("backToDeals")}</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("client")}</h2>
          <p className="font-medium">{deal.client.fullName}</p>
          <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{deal.client.phone}</p>
          <Link className="text-[13px] hover:underline" href={`/portal/management-x7k9/crm/clients/${deal.clientId}`}>{t("openClient")}</Link>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("unit")}</h2>
          {deal.primaryUnit ? (
            <>
              <p className="font-medium">{deal.primaryUnit.floor.building.name} / {deal.primaryUnit.unitNumber}</p>
              <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{deal.primaryUnit.area} m² · {deal.primaryUnit.rooms} {t("rooms")} · {unitStatusLabel(t, deal.primaryUnit.status)}</p>
            </>
          ) : <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("draftDealNoUnit")}</p>}
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("finance")}</h2>
          <p className="text-[13px]">{t("paid")} {paidTotal.toLocaleString()} {deal.currency}</p>
          <p className="text-[13px]">{t("remaining")} {(deal.salePrice - paidTotal).toLocaleString()} {deal.currency}</p>
          <p className="text-[13px]">{t("overdue")} {overdueTotal.toLocaleString()} {deal.currency}</p>
        </div>
        {deal.status === "reserved" && deal.reservationExpiresAt ? (
          <div className="a-card p-4">
            <h2 className="text-[15px] font-semibold mb-3">{t("reservationExpiry")}</h2>
            <ReservationCountdown status={deal.status} expiresAt={deal.reservationExpiresAt.toISOString()} />
          </div>
        ) : null}
      </div>

      {deal.status === "reserved" ? (
        <div className="a-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold">{t("bronControlTitle")}</h2>
              <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>
                {deal.primaryUnit
                  ? `${deal.primaryUnit.floor.building.name} · ${deal.primaryUnit.floor.number}-${t("floor").toLowerCase()} · №${deal.primaryUnit.unitNumber}`
                  : t("draftDealNoUnit")}
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--a-text-secondary)" }}>
                {deal.client.fullName} · {deal.assignedTo?.name || deal.assignedTo?.email || t("unassigned")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {deal.reservationExpiresAt ? <ReservationCountdown status={deal.status} expiresAt={deal.reservationExpiresAt.toISOString()} compact /> : null}
              <span className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>
                {deal.reservationExpiresAt ? deal.reservationExpiresAt.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <DealActions deal={deal} />
      <DealFinanceActions
        plans={deal.paymentPlans.map((plan) => ({ id: plan.id, name: plan.name, status: plan.status }))}
        payments={deal.paymentPlans.flatMap((plan) =>
          plan.payments.map((payment) => ({
            id: payment.id,
            label: payment.label,
            expectedAmount: payment.expectedAmount,
            paidAmount: payment.paidAmount,
            status: payment.status,
          }))
        )}
        documents={deal.documents.map((document) => ({ id: document.id, title: document.title, status: document.status }))}
        refunds={deal.refunds.map((refund) => ({
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="a-card overflow-x-auto">
          <div className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}><h2 className="text-[15px] font-semibold">{t("paymentPlans")}</h2></div>
          {deal.paymentPlans.map((plan) => (
            <div key={plan.id} className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
              <div className="flex justify-between gap-3 text-[13px] items-center">
                <div className="flex flex-col">
                  <strong>{plan.name}</strong>
                  <span style={{ color: "var(--a-text-tertiary)" }}>{paymentPlanStatusLabel(t, plan.status)}</span>
                </div>
                <PaymentPlanPdfButton paymentPlanId={plan.id} />
              </div>
              <table className="a-table mt-3 min-w-[560px]">
                <tbody>
                  {plan.payments.length > 0 ? (
                    plan.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.sequence}. {payment.label}</td>
                        <td>{payment.expectedAmount.toLocaleString()}</td>
                        <td>{payment.paidAmount.toLocaleString()}</td>
                        <td>{paymentStatusLabel(t, payment.status)}</td>
                        <td style={{ textAlign: "right" }}>{payment.dueDate.toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--a-text-tertiary)" }}>
                        {t("paymentPlanNoRows")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">{t("documentsNav")}</h2>
          <div className="flex flex-col gap-3">
            {deal.documents.map((document) => (
              <a key={document.id} href={document.fileUrl} className="text-[13px] hover:underline" target="_blank" rel="noreferrer">
                {document.title} · {documentTypeLabel(t, document.type)} · {documentStatusLabel(t, document.status)}
              </a>
            ))}
            {deal.documents.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("noDocumentsYet")}</p> : null}
          </div>
        </div>
      </div>

      <div className="a-card p-4">
        <h2 className="text-[15px] font-semibold mb-3">{t("activity")}</h2>
        <div className="flex flex-col gap-3">
          {deal.activities.map((activity) => (
            <div key={activity.id} className="text-[13px]">
              <div className="font-medium">{activity.title}</div>
              <div style={{ color: "var(--a-text-tertiary)" }}>{activity.occurredAt.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
