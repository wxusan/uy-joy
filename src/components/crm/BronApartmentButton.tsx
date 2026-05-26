"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Clock, FileText, Handshake, Send } from "lucide-react";

type ManagerOption = { id: string; name: string | null; email: string | null };
type ClientOption = { id: string; fullName: string; phone: string };
type BronUnit = {
  id: string;
  unitNumber: string;
  displayNumber?: string | null;
  buildingName: string;
  floorNumber: number;
  rooms: number;
  area: number;
  totalPrice: number | null;
  status: string;
};

export default function BronApartmentButton({
  unit,
  client,
  defaultClientName,
  defaultClientPhone,
  leadId,
  projectId,
  source,
  assignedToId,
  currentUserId,
  managers = [],
  className = "a-btn a-btn-primary",
  onReserved,
}: {
  unit: BronUnit;
  client?: ClientOption | null;
  leadId?: string | null;
  projectId?: string | null;
  source?: string | null;
  assignedToId?: string | null;
  currentUserId?: string | null;
  managers?: ManagerOption[];
  className?: string;
  onReserved?: (deal: { id: string }) => void;
  defaultClientName?: string | null;
  defaultClientPhone?: string | null;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(client || null);
  const [clientName, setClientName] = useState(client?.fullName || defaultClientName || "");
  const [clientPhone, setClientPhone] = useState(client?.phone || defaultClientPhone || "");
  const [assignedManagerId, setAssignedManagerId] = useState(assignedToId || currentUserId || managers[0]?.id || "");
  const [reservationPreset, setReservationPreset] = useState("48");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [resultDeal, setResultDeal] = useState<{ id: string } | null>(null);
  const [error, setError] = useState("");

  const canReserve = unit.status === "available";
  const unitLabel = `${unit.buildingName} · ${unit.floorNumber}-${t("floor").toLowerCase()} · №${unit.displayNumber || unit.unitNumber}`;
  const priceLabel = unit.totalPrice ? `${Math.round(unit.totalPrice).toLocaleString()} USD` : "—";
  const managerOptions = useMemo(() => {
    const map = new Map<string, ManagerOption>();
    managers.forEach((manager) => map.set(manager.id, manager));
    if (currentUserId && !map.has(currentUserId)) map.set(currentUserId, { id: currentUserId, name: t("me"), email: null });
    return Array.from(map.values());
  }, [currentUserId, managers, t]);

  useEffect(() => {
    if (!open || selectedClient || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/crm/clients?q=${encodeURIComponent(query.trim())}&limit=6`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => setResults((payload?.data || []).map((row: ClientOption) => ({ id: row.id, fullName: row.fullName, phone: row.phone }))))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, selectedClient]);

  function selectClient(nextClient: ClientOption) {
    setSelectedClient(nextClient);
    setClientName(nextClient.fullName);
    setClientPhone(nextClient.phone);
    setQuery("");
    setResults([]);
  }

  async function submit() {
    setBusy(true);
    setError("");
    const body = {
      unitId: unit.id,
      clientId: selectedClient?.id || client?.id || null,
      clientName: selectedClient ? null : clientName,
      clientPhone: selectedClient ? null : clientPhone,
      leadId: leadId || null,
      projectId: projectId || null,
      source: source || null,
      assignedToId: assignedManagerId || null,
      reservationHours: reservationPreset === "custom" ? undefined : Number(reservationPreset),
      reservationExpiresAt: reservationPreset === "custom" && customExpiresAt ? new Date(customExpiresAt).toISOString() : null,
      notes: notes || null,
    };
    const response = await fetch("/api/crm/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error || t("reservationFailed"));
      return;
    }
    const deal = payload.deal;
    setResultDeal(deal);
    onReserved?.(deal);
    router.refresh();
  }

  async function createPdf() {
    if (!resultDeal) return;
    setPdfBusy(true);
    const response = await fetch(`/api/crm/deals/${resultDeal.id}/reservation-slip`, { method: "POST" });
    const document = await response.json().catch(() => null);
    setPdfBusy(false);
    if (!response.ok) {
      setError(document?.error || t("pdfCreateFailed"));
      return;
    }
    if (document?.fileUrl) window.open(document.fileUrl, "_blank");
  }

  return (
    <>
      <button className={className} type="button" disabled={!canReserve} onClick={() => setOpen(true)}>
        <Handshake className="w-3.5 h-3.5" /> {t("bronAction")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-[8px] border bg-white p-5 shadow-2xl" style={{ borderColor: "var(--a-border)" }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold" style={{ color: "var(--a-text)" }}>{t("bronModalTitle")}</h2>
                <p className="text-[13px]" style={{ color: "var(--a-text-secondary)" }}>{t("bronModalSubtitle")}</p>
              </div>
              <button className="a-btn" onClick={() => setOpen(false)}>{tc("cancel")}</button>
            </div>

            {resultDeal ? (
              <div className="mt-5 rounded-[8px] border p-4" style={{ borderColor: "var(--a-border)" }}>
                <div className="text-[15px] font-semibold" style={{ color: "var(--a-success)" }}>{t("bronCreated")}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="a-btn a-btn-primary" href={`/portal/management-x7k9/crm/deals/${resultDeal.id}`}>{t("openDeal")}</Link>
                  <button className="a-btn" type="button" disabled={pdfBusy} onClick={() => void createPdf()}>
                    <FileText className="w-3.5 h-3.5" /> {pdfBusy ? t("quickActionBusy") : t("createBronPdf")}
                  </button>
                  <button className="a-btn" type="button" disabled>
                    <Send className="w-3.5 h-3.5" /> {t("sendTelegram")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="rounded-[8px] border p-3" style={{ borderColor: "var(--a-border)" }}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--a-text)" }}>
                    <Building2 className="w-4 h-4" /> {unitLabel}
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
                    {unit.rooms} {t("rooms")} · {unit.area} m² · {priceLabel}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-[12px] font-medium">
                    {t("client")}
                    <input
                      className="a-input mt-1"
                      value={selectedClient ? `${selectedClient.fullName} · ${selectedClient.phone}` : query}
                      onChange={(event) => {
                        setSelectedClient(null);
                        setQuery(event.target.value);
                        setClientName(event.target.value);
                      }}
                      placeholder={t("bronClientSearch")}
                    />
                    {results.length > 0 ? (
                      <div className="mt-1 rounded border bg-white shadow" style={{ borderColor: "var(--a-border)" }}>
                        {results.map((row) => (
                          <button key={row.id} type="button" className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--a-bg-hover)]" onClick={() => selectClient(row)}>
                            {row.fullName} · {row.phone}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                  <label className="text-[12px] font-medium">
                    {t("phone")}
                    <input className="a-input mt-1" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+998 XX XXX XX XX" />
                  </label>
                  <label className="text-[12px] font-medium">
                    {t("customerName")}
                    <input className="a-input mt-1" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder={t("customerNamePlaceholder")} />
                  </label>
                  <label className="text-[12px] font-medium">
                    {t("responsibleManager")}
                    <select className="a-input mt-1" value={assignedManagerId} onChange={(event) => setAssignedManagerId(event.target.value)}>
                      <option value="">{t("unassigned")}</option>
                      {managerOptions.map((manager) => (
                        <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[12px] font-medium">
                    {t("bronDuration")}
                    <select className="a-input mt-1" value={reservationPreset} onChange={(event) => setReservationPreset(event.target.value)}>
                      <option value="24">24 {t("hoursShort")}</option>
                      <option value="48">48 {t("hoursShort")}</option>
                      <option value="72">72 {t("hoursShort")}</option>
                      <option value="custom">{t("customDate")}</option>
                    </select>
                  </label>
                  {reservationPreset === "custom" ? (
                    <label className="text-[12px] font-medium">
                      {t("reservationExpiresAt")}
                      <input className="a-input mt-1" type="datetime-local" value={customExpiresAt} onChange={(event) => setCustomExpiresAt(event.target.value)} />
                    </label>
                  ) : null}
                </div>
                <label className="text-[12px] font-medium">
                  {t("notes")}
                  <textarea className="a-input mt-1 min-h-[78px]" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("bronNotesPlaceholder")} />
                </label>

                {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div> : null}

                <div className="flex justify-end gap-2">
                  <button className="a-btn" type="button" onClick={() => setOpen(false)}>{tc("cancel")}</button>
                  <button className="a-btn a-btn-primary" type="button" disabled={busy || (!selectedClient && (!clientName.trim() || !clientPhone.trim()))} onClick={() => void submit()}>
                    <Clock className="w-3.5 h-3.5" /> {busy ? t("quickActionBusy") : t("bronAction")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
