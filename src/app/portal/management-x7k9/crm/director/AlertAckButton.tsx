"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AlertAckButton({ alertId }: { alertId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function acknowledge() {
    setBusy(true);
    const res = await fetch(`/api/crm/alerts/${alertId}/ack`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button className="a-btn !h-7 !px-2" disabled={busy} onClick={() => void acknowledge()}>
      <Check className="h-3.5 w-3.5" /> {busy ? t("quickActionBusy") : t("directorAcknowledge")}
    </button>
  );
}
