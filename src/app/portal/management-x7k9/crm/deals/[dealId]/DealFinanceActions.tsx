"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; name: string; status: string };
type Payment = { id: string; label: string; expectedAmount: number; paidAmount: number; status: string };
type DocumentRow = { id: string; title: string; status: string };
type Refund = { id: string; amount: number; currency: string; status: string };

export default function DealFinanceActions({
  plans,
  payments,
  documents,
  refunds,
}: {
  plans: Plan[];
  payments: Payment[];
  documents: DocumentRow[];
  refunds: Refund[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    setBusy(path);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(null);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      window.alert(payload?.error || "Request failed");
      return;
    }
    router.refresh();
  }

  async function patch(path: string, body: unknown) {
    setBusy(path);
    const res = await fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      window.alert(payload?.error || "Request failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="a-card p-4 grid gap-4">
      <h2 className="text-[15px] font-semibold">Finance and document actions</h2>
      <div className="grid gap-3 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold">Payment plans</div>
          {plans.map((plan) => (
            <button key={plan.id} className="a-btn justify-between" disabled={Boolean(busy) || plan.status !== "draft"} onClick={() => void post(`/api/crm/payment-plans/${plan.id}/activate`)}>
              <span>{plan.name}</span>
              <span>{plan.status === "draft" ? "activate" : plan.status}</span>
            </button>
          ))}
          {plans.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No plans yet.</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold">Payments</div>
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-2">
              <button
                className="a-btn flex-1 justify-between"
                disabled={Boolean(busy) || payment.status === "paid"}
                onClick={() => void patch(`/api/crm/payments/${payment.id}`, { paidAmount: payment.expectedAmount, status: "paid" })}
              >
                <span>{payment.label}</span>
                <span>{payment.status}</span>
              </button>
              <button
                className="a-btn"
                disabled={Boolean(busy) || payment.status === "paid"}
                onClick={() => {
                  const value = window.prompt("Paid amount", String(payment.paidAmount || ""));
                  if (value) void patch(`/api/crm/payments/${payment.id}`, { paidAmount: Number(value) });
                }}
              >
                partial
              </button>
            </div>
          ))}
          {payments.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No payments yet.</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold">Documents</div>
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-2">
              <button className="a-btn flex-1 justify-between" disabled={Boolean(busy) || document.status === "approved"} onClick={() => void post(`/api/crm/documents/${document.id}/approve`)}>
                <span>{document.title}</span>
                <span>{document.status}</span>
              </button>
              <button
                className="a-btn a-btn-danger"
                disabled={Boolean(busy) || document.status === "rejected"}
                onClick={() => {
                  const reason = window.prompt("Rejection reason");
                  if (reason) void post(`/api/crm/documents/${document.id}/reject`, { rejectionReason: reason });
                }}
              >
                reject
              </button>
            </div>
          ))}
          {documents.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No documents yet.</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold">Refunds</div>
          {refunds.map((refund) => (
            <div key={refund.id} className="flex items-center gap-2">
              <button
                className="a-btn flex-1 justify-between"
                disabled={Boolean(busy) || refund.status !== "requested"}
                onClick={() => void patch(`/api/crm/refunds/${refund.id}`, { status: "approved" })}
              >
                <span>{refund.amount.toLocaleString()} {refund.currency}</span>
                <span>{refund.status === "requested" ? "approve" : refund.status}</span>
              </button>
              <button
                className="a-btn"
                disabled={Boolean(busy) || refund.status !== "approved"}
                onClick={() => void patch(`/api/crm/refunds/${refund.id}`, { status: "paid" })}
              >
                paid
              </button>
              <button
                className="a-btn a-btn-danger"
                disabled={Boolean(busy) || refund.status !== "requested"}
                onClick={() => {
                  const notes = window.prompt("Rejection note");
                  if (notes) void patch(`/api/crm/refunds/${refund.id}`, { status: "rejected", notes });
                }}
              >
                reject
              </button>
            </div>
          ))}
          {refunds.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>No refunds.</p> : null}
        </div>
      </div>
    </div>
  );
}
