"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Deal = {
  id: string;
  status: string;
  listPrice: number;
  discountAmount: number;
  discountPercent: number;
  initialPaymentAmount: number;
  initialPaymentPercent: number;
  paymentTermMonths: number;
};

export default function DealActions({ deal }: { deal: Deal }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    listPrice: String(deal.listPrice),
    discountAmount: String(deal.discountAmount || ""),
    initialPaymentAmount: String(deal.initialPaymentAmount || ""),
    termMonths: String(deal.paymentTermMonths || 12),
  });
  const [documentForm, setDocumentForm] = useState({
    type: "passport",
    title: "",
    fileUrl: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

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

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    await post(`/api/crm/deals/${deal.id}/payment-plan`, {
      name: "Default payment plan",
      type: Number(paymentForm.termMonths) > 0 ? "installment" : "cash",
      listPrice: Number(paymentForm.listPrice || 0),
      discountAmount: Number(paymentForm.discountAmount || 0),
      initialPaymentAmount: Number(paymentForm.initialPaymentAmount || 0),
      termMonths: Number(paymentForm.termMonths || 0),
      startDate: new Date().toISOString(),
    });
  }

  async function uploadDocument(event: React.FormEvent) {
    event.preventDefault();
    setBusy("document-upload");
    let fileUrl = documentForm.fileUrl;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileSize: number | undefined;

    if (documentFile) {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("type", "document");
      formData.append("id", deal.id);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadPayload = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok) {
        setBusy(null);
        window.alert(uploadPayload?.error || "Upload failed");
        return;
      }
      fileUrl = uploadPayload.url;
      fileName = uploadPayload.originalFilename || uploadPayload.filename;
      mimeType = uploadPayload.mimeType;
      fileSize = uploadPayload.size;
    }

    if (!fileUrl) {
      setBusy(null);
      window.alert("Choose a file or paste a file URL");
      return;
    }

    await post("/api/crm/documents", {
      dealId: deal.id,
      type: documentForm.type,
      title: documentForm.title,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
    });
    setDocumentForm({ type: "passport", title: "", fileUrl: "" });
    setDocumentFile(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="a-card p-4 flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Deal actions</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="a-btn" disabled={Boolean(busy)} onClick={() => post(`/api/crm/deals/${deal.id}/reserve`, {})}>Reserve</button>
          <button className="a-btn" disabled={Boolean(busy)} onClick={() => post(`/api/crm/deals/${deal.id}/reservation-slip`)}>Slip PDF</button>
          <button
            className="a-btn"
            disabled={Boolean(busy)}
            onClick={() => {
              if (deal.status === "reserved") {
                const overrideReason = window.prompt("Owner/admin override reason");
                if (!overrideReason) return;
                void post(`/api/crm/deals/${deal.id}/mark-sold`, { overrideReserved: true, overrideReason });
                return;
              }
              void post(`/api/crm/deals/${deal.id}/mark-sold`);
            }}
          >
            Mark sold
          </button>
          <button
            className="a-btn a-btn-danger"
            disabled={Boolean(busy)}
            onClick={() => {
              const reason = window.prompt("Cancellation reason");
              if (reason) void post(`/api/crm/deals/${deal.id}/cancel`, { reason });
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      <form className="a-card p-4 grid gap-3" onSubmit={createPlan}>
        <h2 className="text-[15px] font-semibold">Calculator / payment plan</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="a-input" type="number" value={paymentForm.listPrice} onChange={(e) => setPaymentForm({ ...paymentForm, listPrice: e.target.value })} placeholder="List price" />
          <input className="a-input" type="number" value={paymentForm.discountAmount} onChange={(e) => setPaymentForm({ ...paymentForm, discountAmount: e.target.value })} placeholder="Discount" />
          <input className="a-input" type="number" value={paymentForm.initialPaymentAmount} onChange={(e) => setPaymentForm({ ...paymentForm, initialPaymentAmount: e.target.value })} placeholder="Initial" />
          <input className="a-input" type="number" value={paymentForm.termMonths} onChange={(e) => setPaymentForm({ ...paymentForm, termMonths: e.target.value })} placeholder="Months" />
        </div>
        <button className="a-btn a-btn-primary" type="submit" disabled={Boolean(busy)}>Save draft plan</button>
      </form>
      <form className="a-card p-4 grid gap-3 lg:col-span-2" onSubmit={uploadDocument}>
        <h2 className="text-[15px] font-semibold">Upload document</h2>
        <div className="grid gap-2 md:grid-cols-[180px_1fr_1.5fr_auto]">
          <select className="a-input" value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}>
            {["passport", "contract", "reservation_agreement", "payment_receipt", "bank_document", "other"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input className="a-input" value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} placeholder="Title" required />
          <input className="a-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
          <button className="a-btn" type="submit" disabled={Boolean(busy)}>Upload</button>
        </div>
        <input className="a-input" value={documentForm.fileUrl} onChange={(e) => setDocumentForm({ ...documentForm, fileUrl: e.target.value })} placeholder="Or paste an existing file URL" />
      </form>
    </div>
  );
}
