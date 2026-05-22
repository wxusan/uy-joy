import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { dealVisibilityWhere } from "@/lib/real-estate";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import DealActions from "./DealActions";
import DealFinanceActions from "./DealFinanceActions";

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
          <p className="a-page-sub">{deal.client.fullName} · {deal.status} · {deal.salePrice.toLocaleString()} {deal.currency}</p>
        </div>
        <Link href="/portal/management-x7k9/crm/deals" className="a-btn">Back to deals</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Client</h2>
          <p className="font-medium">{deal.client.fullName}</p>
          <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{deal.client.phone}</p>
          <Link className="text-[13px] hover:underline" href={`/portal/management-x7k9/crm/clients/${deal.clientId}`}>Open client</Link>
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Unit</h2>
          {deal.primaryUnit ? (
            <>
              <p className="font-medium">{deal.primaryUnit.floor.building.name} / {deal.primaryUnit.unitNumber}</p>
              <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{deal.primaryUnit.area} m2 · {deal.primaryUnit.rooms} rooms · {deal.primaryUnit.status}</p>
            </>
          ) : <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>Draft deal without unit.</p>}
        </div>
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Finance</h2>
          <p className="text-[13px]">Paid: {paidTotal.toLocaleString()} {deal.currency}</p>
          <p className="text-[13px]">Remaining: {(deal.salePrice - paidTotal).toLocaleString()} {deal.currency}</p>
          <p className="text-[13px]">Overdue: {overdueTotal.toLocaleString()} {deal.currency}</p>
        </div>
      </div>

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
          <div className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}><h2 className="text-[15px] font-semibold">Payment plans</h2></div>
          {deal.paymentPlans.map((plan) => (
            <div key={plan.id} className="p-4 border-b" style={{ borderColor: "var(--a-border)" }}>
              <div className="flex justify-between gap-3 text-[13px]"><strong>{plan.name}</strong><span>{plan.status}</span></div>
              <table className="a-table mt-3 min-w-[560px]">
                <tbody>
                  {plan.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.sequence}. {payment.label}</td>
                      <td>{payment.expectedAmount.toLocaleString()}</td>
                      <td>{payment.paidAmount.toLocaleString()}</td>
                      <td>{payment.status}</td>
                      <td style={{ textAlign: "right" }}>{payment.dueDate.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold mb-3">Documents</h2>
          <div className="flex flex-col gap-3">
            {deal.documents.map((document) => (
              <a key={document.id} href={document.fileUrl} className="text-[13px] hover:underline" target="_blank" rel="noreferrer">
                {document.title} · {document.type} · {document.status}
              </a>
            ))}
            {deal.documents.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No documents yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="a-card p-4">
        <h2 className="text-[15px] font-semibold mb-3">Activity</h2>
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
