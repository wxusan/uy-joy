"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import BronApartmentButton from "@/components/crm/BronApartmentButton";

type Qualification = {
  cityRegion: string | null;
  familySize: number | null;
  roomCounts: number[] | null;
  preferredBuilding: string | null;
  preferredFloorMin: number | null;
  preferredFloorMax: number | null;
  preferredAreaMin: number | null;
  preferredAreaMax: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  paymentPreference: string | null;
  initialPaymentAmount: number | null;
  monthlyPaymentComfort: number | null;
  installmentMonths: number | null;
  buyingPurpose: string | null;
  temperature: string | null;
  urgency: string | null;
  seriousnessLevel: string | null;
  decisionMaker: string | null;
  objection: string | null;
  bestCallTime: string | null;
  preferredChannel: string | null;
};

type InterestedUnit = {
  unitId: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  totalPrice: number | null;
  floorNumber: number;
  buildingName: string;
  interestLevel: string;
};

type Recommendation = {
  unitId: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  totalPrice: number | null;
  floorNumber: number;
  buildingName: string;
  score: number;
  reason: string;
};

type FormState = Record<keyof Qualification, string> & { roomCounts: string };

function valueOf(value: unknown) {
  if (Array.isArray(value)) return value.join(",");
  return value === null || value === undefined ? "" : String(value);
}

function numeric(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function toForm(qualification: Qualification | null): FormState {
  return {
    cityRegion: valueOf(qualification?.cityRegion),
    familySize: valueOf(qualification?.familySize),
    roomCounts: valueOf(qualification?.roomCounts),
    preferredBuilding: valueOf(qualification?.preferredBuilding),
    preferredFloorMin: valueOf(qualification?.preferredFloorMin),
    preferredFloorMax: valueOf(qualification?.preferredFloorMax),
    preferredAreaMin: valueOf(qualification?.preferredAreaMin),
    preferredAreaMax: valueOf(qualification?.preferredAreaMax),
    budgetMin: valueOf(qualification?.budgetMin),
    budgetMax: valueOf(qualification?.budgetMax),
    paymentPreference: valueOf(qualification?.paymentPreference),
    initialPaymentAmount: valueOf(qualification?.initialPaymentAmount),
    monthlyPaymentComfort: valueOf(qualification?.monthlyPaymentComfort),
    installmentMonths: valueOf(qualification?.installmentMonths),
    buyingPurpose: valueOf(qualification?.buyingPurpose),
    temperature: valueOf(qualification?.temperature),
    urgency: valueOf(qualification?.urgency),
    seriousnessLevel: valueOf(qualification?.seriousnessLevel),
    decisionMaker: valueOf(qualification?.decisionMaker),
    objection: valueOf(qualification?.objection),
    bestCallTime: valueOf(qualification?.bestCallTime),
    preferredChannel: valueOf(qualification?.preferredChannel),
  };
}

export default function ClientQualificationPanel({
  clientId,
  leadId,
  initialQualification,
  initialCompleteness,
  initialInterestedUnits,
  initialRecommendations,
  canEdit,
  client,
  currentUserId,
  assignedToId,
  managers = [],
}: {
  clientId: string;
  leadId?: string | null;
  initialQualification: Qualification | null;
  initialCompleteness: number;
  initialInterestedUnits: InterestedUnit[];
  initialRecommendations: Recommendation[];
  canEdit: boolean;
  client?: { id: string; fullName: string; phone: string } | null;
  currentUserId?: string | null;
  assignedToId?: string | null;
  managers?: { id: string; name: string | null; email: string | null }[];
}) {
  const t = useTranslations("admin");
  const [form, setForm] = useState<FormState>(() => toForm(initialQualification));
  const [completeness, setCompleteness] = useState(initialCompleteness);
  const [interestedUnits, setInterestedUnits] = useState(initialInterestedUnits);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [saving, setSaving] = useState(false);

  const selectedRooms = useMemo(
    () => new Set(form.roomCounts.split(",").map((item) => Number(item)).filter(Boolean)),
    [form.roomCounts]
  );

  function setField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRoom(room: number) {
    const next = new Set(selectedRooms);
    if (next.has(room)) next.delete(room);
    else next.add(room);
    setField("roomCounts", Array.from(next).sort((a, b) => a - b).join(","));
  }

  async function refreshRecommendations() {
    const response = await fetch(`/api/crm/clients/${clientId}/recommendations`);
    if (!response.ok) return;
    const data = await response.json();
    setRecommendations(data.data || []);
  }

  async function save() {
    setSaving(true);
    const payload = {
      cityRegion: form.cityRegion || null,
      familySize: numeric(form.familySize),
      roomCounts: Array.from(selectedRooms),
      preferredBuilding: form.preferredBuilding || null,
      preferredFloorMin: numeric(form.preferredFloorMin),
      preferredFloorMax: numeric(form.preferredFloorMax),
      preferredAreaMin: numeric(form.preferredAreaMin),
      preferredAreaMax: numeric(form.preferredAreaMax),
      budgetMin: numeric(form.budgetMin),
      budgetMax: numeric(form.budgetMax),
      paymentPreference: form.paymentPreference || null,
      initialPaymentAmount: numeric(form.initialPaymentAmount),
      monthlyPaymentComfort: numeric(form.monthlyPaymentComfort),
      installmentMonths: numeric(form.installmentMonths),
      buyingPurpose: form.buyingPurpose || null,
      temperature: form.temperature || null,
      urgency: form.urgency || null,
      seriousnessLevel: form.seriousnessLevel || null,
      decisionMaker: form.decisionMaker || null,
      objection: form.objection || null,
      bestCallTime: form.bestCallTime || null,
      preferredChannel: form.preferredChannel || null,
    };
    const response = await fetch(`/api/crm/clients/${clientId}/qualification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const data = await response.json();
      setCompleteness(data.completeness || 0);
      await refreshRecommendations();
    }
    setSaving(false);
  }

  async function addInterestedUnit(unitId: string) {
    const response = await fetch(`/api/crm/clients/${clientId}/interested-units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, leadId: leadId || null, interestLevel: "interested" }),
    });
    if (!response.ok) return;
    const list = await fetch(`/api/crm/clients/${clientId}/interested-units`).then((res) => res.json());
    setInterestedUnits(list.data || []);
  }

  async function removeInterestedUnit(unitId: string) {
    const response = await fetch(`/api/crm/clients/${clientId}/interested-units/${unitId}`, { method: "DELETE" });
    if (!response.ok) return;
    setInterestedUnits((items) => items.filter((item) => item.unitId !== unitId));
  }

  const selectOptions = {
    paymentPreference: [
      ["", t("qualificationUnknown")],
      ["cash", t("paymentCash")],
      ["installment", t("paymentInstallment")],
      ["mortgage", t("paymentMortgage")],
      ["subsidy", t("paymentSubsidy")],
      ["unknown", t("paymentUnknown")],
    ],
    buyingPurpose: [
      ["", t("qualificationUnknown")],
      ["self", t("purposeSelf")],
      ["investment", t("purposeInvestment")],
      ["child", t("purposeChild")],
      ["rent", t("purposeRent")],
      ["family", t("purposeFamily")],
    ],
    temperature: [
      ["", t("qualificationUnknown")],
      ["hot", t("temperatureHot")],
      ["warm", t("temperatureWarm")],
      ["cold", t("temperatureCold")],
      ["info_only", t("temperatureInfoOnly")],
    ],
    urgency: [
      ["", t("qualificationUnknown")],
      ["today", t("urgencyToday")],
      ["week", t("urgencyWeek")],
      ["month", t("urgencyMonth")],
      ["later", t("urgencyLater")],
      ["unknown", t("urgencyUnknown")],
    ],
    seriousnessLevel: [
      ["", t("qualificationUnknown")],
      ["high", t("seriousnessHigh")],
      ["medium", t("seriousnessMedium")],
      ["low", t("seriousnessLow")],
      ["unknown", t("qualificationUnknown")],
    ],
    preferredChannel: [
      ["", t("qualificationUnknown")],
      ["phone", t("channelPhone")],
      ["telegram", "Telegram"],
      ["sms", "SMS"],
      ["instagram", "Instagram"],
      ["any", t("channelAny")],
    ],
  } as const;

  const interestedIds = new Set(interestedUnits.map((unit) => unit.unitId));

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="a-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">{t("qualificationTitle")}</h2>
            <p className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{t("qualificationSubtitle")}</p>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-semibold">{completeness}%</div>
            <div className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>{t("profileComplete")}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-[12px] font-medium">{t("qualificationRooms")}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((room) => (
                <button
                  key={room}
                  type="button"
                  disabled={!canEdit}
                  className={`a-btn !h-8 !px-3 ${selectedRooms.has(room) ? "a-btn-primary" : ""}`}
                  onClick={() => toggleRoom(room)}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>
          <Field label={t("qualificationBudgetMax")} value={form.budgetMax} disabled={!canEdit} onChange={(value) => setField("budgetMax", value)} />
          <Select label={t("qualificationPayment")} value={form.paymentPreference} options={selectOptions.paymentPreference} disabled={!canEdit} onChange={(value) => setField("paymentPreference", value)} />
          <Select label={t("qualificationPurpose")} value={form.buyingPurpose} options={selectOptions.buyingPurpose} disabled={!canEdit} onChange={(value) => setField("buyingPurpose", value)} />
          <Select label={t("qualificationTemperature")} value={form.temperature} options={selectOptions.temperature} disabled={!canEdit} onChange={(value) => setField("temperature", value)} />
          <Select label={t("qualificationUrgency")} value={form.urgency} options={selectOptions.urgency} disabled={!canEdit} onChange={(value) => setField("urgency", value)} />
          <Select label={t("qualificationSeriousness")} value={form.seriousnessLevel} options={selectOptions.seriousnessLevel} disabled={!canEdit} onChange={(value) => setField("seriousnessLevel", value)} />
          <Select label={t("qualificationChannel")} value={form.preferredChannel} options={selectOptions.preferredChannel} disabled={!canEdit} onChange={(value) => setField("preferredChannel", value)} />
          <Field label={t("qualificationInitialPayment")} value={form.initialPaymentAmount} disabled={!canEdit} onChange={(value) => setField("initialPaymentAmount", value)} />
          <Field label={t("qualificationMonthly")} value={form.monthlyPaymentComfort} disabled={!canEdit} onChange={(value) => setField("monthlyPaymentComfort", value)} />
          <Field label={t("qualificationBuilding")} value={form.preferredBuilding} disabled={!canEdit} onChange={(value) => setField("preferredBuilding", value)} />
          <Field label={t("qualificationBestTime")} value={form.bestCallTime} disabled={!canEdit} onChange={(value) => setField("bestCallTime", value)} />
          <Field label={t("qualificationDecisionMaker")} value={form.decisionMaker} disabled={!canEdit} onChange={(value) => setField("decisionMaker", value)} />
          <Field label={t("qualificationObjection")} value={form.objection} disabled={!canEdit} onChange={(value) => setField("objection", value)} />
        </div>

        {canEdit ? (
          <button className="a-btn a-btn-primary mt-4" onClick={() => void save()} disabled={saving}>
            {saving ? t("quickActionBusy") : t("saveQualification")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold">{t("interestedUnits")}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {interestedUnits.map((unit) => (
              <div key={unit.unitId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-[13px]" style={{ borderColor: "var(--a-border)" }}>
                <div>
                  <div className="font-medium">{unit.buildingName} · {unit.floorNumber}-qavat · {unit.unitNumber}</div>
                  <div style={{ color: "var(--a-text-tertiary)" }}>{unit.rooms} xona · {unit.area} m² · {unit.totalPrice ? unit.totalPrice.toLocaleString() : "—"}</div>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {unit.status === "available" ? (
                      <BronApartmentButton
                        unit={{
                          id: unit.unitId,
                          unitNumber: unit.unitNumber,
                          buildingName: unit.buildingName,
                          floorNumber: unit.floorNumber,
                          rooms: unit.rooms,
                          area: unit.area,
                          totalPrice: unit.totalPrice,
                          status: unit.status,
                        }}
                        client={client || { id: clientId, fullName: "", phone: "" }}
                        leadId={leadId || null}
                        assignedToId={assignedToId || null}
                        currentUserId={currentUserId || null}
                        managers={managers}
                        className="a-btn a-btn-primary !h-7 !px-2"
                      />
                    ) : null}
                    <button className="a-btn !h-7 !px-2" onClick={() => void removeInterestedUnit(unit.unitId)}>×</button>
                  </div>
                ) : null}
              </div>
            ))}
            {interestedUnits.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("noInterestedUnits")}</p> : null}
          </div>
        </div>

        <div className="a-card p-4">
          <h2 className="text-[15px] font-semibold">{t("recommendationsTitle")}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {recommendations.map((unit) => (
              <div key={unit.unitId} className="rounded-md border px-3 py-2 text-[13px]" style={{ borderColor: "var(--a-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{unit.buildingName} · {unit.floorNumber}-qavat · {unit.unitNumber}</div>
                    <div style={{ color: "var(--a-text-tertiary)" }}>{unit.rooms} xona · {unit.area} m² · {unit.totalPrice ? unit.totalPrice.toLocaleString() : "—"}</div>
                    <div className="mt-1 text-[12px]" style={{ color: "var(--a-success)" }}>{unit.reason}</div>
                  </div>
                  {canEdit && !interestedIds.has(unit.unitId) ? (
                    <button className="a-btn !h-8 !px-2" onClick={() => void addInterestedUnit(unit.unitId)}>{t("addInterestedUnit")}</button>
                  ) : null}
                </div>
              </div>
            ))}
            {recommendations.length === 0 ? <p className="text-[13px]" style={{ color: "var(--a-text-tertiary)" }}>{t("noRecommendations")}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="text-[12px] font-medium">
      {label}
      <input className="a-input mt-1" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[12px] font-medium">
      {label}
      <select className="a-input mt-1" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
  );
}
