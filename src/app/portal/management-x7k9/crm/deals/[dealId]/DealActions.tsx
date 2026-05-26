"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DOCUMENT_TYPE_OPTIONS, documentTypeLabel } from "@/lib/crm-labels";

type Deal = {
  id: string;
  status: string;
  listPrice: number;
  discountAmount: number;
  discountPercent: number;
  initialPaymentAmount: number;
  initialPaymentPercent: number;
  paymentTermMonths: number;
  currency: string;
};

export default function DealActions({ deal }: { deal: Deal }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    listPrice: String(deal.listPrice),
    cashDiscountAmount: String(deal.discountAmount || ""),
    installmentDiscountAmount: String(deal.discountAmount || ""),
    initialPaymentAmount: String(deal.initialPaymentAmount || ""),
    termMonths: String(deal.paymentTermMonths || 12),
    startDate: new Date().toISOString().slice(0, 10),
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
      window.alert(payload?.error || t("requestFailed"));
      return;
    }
    router.refresh();
  }

  const listPrice = Number(paymentForm.listPrice || 0);
  const cashDiscount = Number(paymentForm.cashDiscountAmount || 0);
  const installmentDiscount = Number(paymentForm.installmentDiscountAmount || 0);
  const installmentMonths = Math.max(0, Number(paymentForm.termMonths || 0));
  const installmentSalePrice = Math.max(0, listPrice - installmentDiscount);
  const initialPayment = Math.min(Math.max(0, Number(paymentForm.initialPaymentAmount || 0)), installmentSalePrice);
  const installmentRemaining = Math.max(0, installmentSalePrice - initialPayment);
  const monthlyPayment = installmentMonths > 0 ? installmentRemaining / installmentMonths : 0;
  const cashSalePrice = Math.max(0, listPrice - cashDiscount);
  const formatMoney = (value: number) => `${Math.round(value).toLocaleString()} ${deal.currency}`;

  async function createPlan(type: "cash" | "installment") {
    const isCash = type === "cash";
    const salePrice = isCash ? cashSalePrice : installmentSalePrice;
    const discountAmount = isCash ? cashDiscount : installmentDiscount;
    await post(`/api/crm/deals/${deal.id}/payment-plan`, {
      name: isCash ? t("cashPlanName") : t("installmentPlanName"),
      type,
      listPrice,
      discountAmount,
      initialPaymentAmount: isCash ? salePrice : initialPayment,
      termMonths: isCash ? 0 : installmentMonths,
      startDate: new Date(`${paymentForm.startDate}T00:00:00`).toISOString(),
      notes: isCash ? t("cashPlanNote") : t("installmentPlanNote"),
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
        window.alert(uploadPayload?.error || t("uploadFailed"));
        return;
      }
      fileUrl = uploadPayload.url;
      fileName = uploadPayload.originalFilename || uploadPayload.filename;
      mimeType = uploadPayload.mimeType;
      fileSize = uploadPayload.size;
    }

    if (!fileUrl) {
      setBusy(null);
      window.alert(t("chooseFileOrUrl"));
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
        <h2 className="text-[15px] font-semibold">{t("dealActions")}</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="a-btn" disabled={Boolean(busy)} onClick={() => post(`/api/crm/deals/${deal.id}/reserve`, {})}>{t("reserve")}</button>
          <button className="a-btn" disabled={Boolean(busy)} onClick={() => post(`/api/crm/deals/${deal.id}/reservation-slip`)}>{t("slipPdf")}</button>
          {deal.status === "reserved" ? (
            <button
              className="a-btn"
              disabled={Boolean(busy)}
              onClick={() => {
                const hours = Number(window.prompt(t("extendBronHoursPrompt"), "48"));
                if (!Number.isFinite(hours) || hours <= 0) return;
                const reason = window.prompt(t("extendBronReasonPrompt"));
                if (!reason) return;
                const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                void post(`/api/crm/deals/${deal.id}/extend-reservation`, { reservationExpiresAt: expiresAt, reason });
              }}
            >
              {t("extendBron")}
            </button>
          ) : null}
          <button
            className="a-btn"
            disabled={Boolean(busy)}
            onClick={() => {
              if (deal.status === "reserved") {
                const overrideReason = window.prompt(t("overrideReason"));
                if (!overrideReason) return;
                void post(`/api/crm/deals/${deal.id}/mark-sold`, { overrideReserved: true, overrideReason });
                return;
              }
              void post(`/api/crm/deals/${deal.id}/mark-sold`);
            }}
          >
            {t("markSold")}
          </button>
          <button
            className="a-btn a-btn-danger"
            disabled={Boolean(busy)}
            onClick={() => {
              const reason = window.prompt(t("cancellationReason"));
              if (reason) void post(`/api/crm/deals/${deal.id}/cancel`, { reason });
            }}
          >
            {tc("cancel")}
          </button>
        </div>
      </div>
      <div className="a-card p-4 grid gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{t("adminPriceCalculator")}</h2>
          <p className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{t("adminPriceCalculatorSubtitle")}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          <input className="a-input" type="number" value={paymentForm.listPrice} onChange={(e) => setPaymentForm({ ...paymentForm, listPrice: e.target.value })} placeholder={t("listPrice")} />
          <input className="a-input" type="number" value={paymentForm.cashDiscountAmount} onChange={(e) => setPaymentForm({ ...paymentForm, cashDiscountAmount: e.target.value })} placeholder={t("cashDiscount")} />
          <input className="a-input" type="number" value={paymentForm.installmentDiscountAmount} onChange={(e) => setPaymentForm({ ...paymentForm, installmentDiscountAmount: e.target.value })} placeholder={t("installmentDiscount")} />
          <input className="a-input" type="number" value={paymentForm.initialPaymentAmount} onChange={(e) => setPaymentForm({ ...paymentForm, initialPaymentAmount: e.target.value })} placeholder={t("initialPayment")} />
          <input className="a-input" type="number" value={paymentForm.termMonths} onChange={(e) => setPaymentForm({ ...paymentForm, termMonths: e.target.value })} placeholder={t("months")} />
        </div>
        <input className="a-input max-w-[220px]" type="date" value={paymentForm.startDate} onChange={(e) => setPaymentForm({ ...paymentForm, startDate: e.target.value })} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border p-3 grid gap-2" style={{ borderColor: "var(--a-border)" }}>
            <div className="text-[13px] font-semibold">{t("cashPayment")}</div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>{t("cashPaymentDescription")}</div>
            <dl className="grid gap-1 text-[12px]">
              <div className="flex justify-between gap-2"><dt>{t("listPrice")}</dt><dd>{formatMoney(listPrice)}</dd></div>
              <div className="flex justify-between gap-2"><dt>{t("discount")}</dt><dd>{formatMoney(cashDiscount)}</dd></div>
              <div className="flex justify-between gap-2 font-semibold"><dt>{t("agreedPrice")}</dt><dd>{formatMoney(cashSalePrice)}</dd></div>
            </dl>
            <button className="a-btn a-btn-primary" type="button" disabled={Boolean(busy)} onClick={() => void createPlan("cash")}>{t("saveCashPlan")}</button>
          </div>
          <div className="rounded border p-3 grid gap-2" style={{ borderColor: "var(--a-border)" }}>
            <div className="text-[13px] font-semibold">{t("installmentPayment")}</div>
            <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>{t("installmentPaymentDescription")}</div>
            <dl className="grid gap-1 text-[12px]">
              <div className="flex justify-between gap-2"><dt>{t("agreedPrice")}</dt><dd>{formatMoney(installmentSalePrice)}</dd></div>
              <div className="flex justify-between gap-2"><dt>{t("initialPayment")}</dt><dd>{formatMoney(initialPayment)}</dd></div>
              <div className="flex justify-between gap-2"><dt>{t("remaining")}</dt><dd>{formatMoney(installmentRemaining)}</dd></div>
              <div className="flex justify-between gap-2 font-semibold"><dt>{t("monthlyPayment")}</dt><dd>{formatMoney(monthlyPayment)} × {installmentMonths}</dd></div>
            </dl>
            <button className="a-btn a-btn-primary" type="button" disabled={Boolean(busy)} onClick={() => void createPlan("installment")}>{t("saveInstallmentPlan")}</button>
          </div>
        </div>
      </div>
      <form className="a-card p-4 grid gap-3 lg:col-span-2" onSubmit={uploadDocument}>
        <h2 className="text-[15px] font-semibold">{t("uploadDocument")}</h2>
        <div className="grid gap-2 md:grid-cols-[180px_1fr_1.5fr_auto]">
          <select className="a-input" value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}>
            {DOCUMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{documentTypeLabel(t, type)}</option>)}
          </select>
          <input className="a-input" value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} placeholder={t("documentTitle")} required />
          <input className="a-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
          <button className="a-btn" type="submit" disabled={Boolean(busy)}>{t("upload")}</button>
        </div>
        <input className="a-input" value={documentForm.fileUrl} onChange={(e) => setDocumentForm({ ...documentForm, fileUrl: e.target.value })} placeholder={t("pasteFileUrl")} />
      </form>
    </div>
  );
}
