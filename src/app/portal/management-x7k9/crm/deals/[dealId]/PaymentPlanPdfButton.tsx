"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function PaymentPlanPdfButton({ paymentPlanId }: { paymentPlanId: string }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);

  async function generatePdf() {
    setBusy(true);
    const res = await fetch(`/api/crm/payment-plans/${paymentPlanId}/offer-pdf`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      window.alert(payload?.error || t("requestFailed"));
      return;
    }
    router.refresh();
  }

  return (
    <button className="a-btn !h-7 !px-2" type="button" disabled={busy} onClick={() => void generatePdf()}>
      {busy ? t("quickActionBusy") : t("paymentOfferPdf")}
    </button>
  );
}
