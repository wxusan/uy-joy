"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";
import BronApartmentButton from "@/components/crm/BronApartmentButton";
import ReservationCountdown, { getReservationTone } from "@/components/crm/ReservationCountdown";

interface Unit {
  id: string;
  unitNumber: string;
  displayNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerNotes: string | null;
  reservedAt: string | Date | null;
  soldAt: string | Date | null;
  reservationExpiresAt: string | Date | null;
  currentDeal: {
    id: string;
    dealNumber: string;
    status: string;
    salePrice: number;
    currency: string;
    client: { fullName: string; phone: string };
    assignedTo: { name: string | null; email: string | null } | null;
    paymentPlans: {
      id: string;
      status: string;
      payments: { id: string; status: string; dueDate: string | Date; expectedAmount: number; paidAmount: number }[];
    }[];
    documents: { id: string; status: string }[];
  } | null;
  floor: {
    id: string;
    number: number;
    basePricePerM2: number | null;
    building: { id: string; name: string };
  };
}

interface Building {
  id: string;
  name: string;
}

interface Props {
  initialUnits: Unit[];
  initialBuildings: Building[];
  projectId: string;
  currentUserId: string | null;
  managers: { id: string; name: string | null; email: string | null }[];
}

const statusMeta = (status: string) => {
  if (status === "reserved") return { dot: "bg-neutral-500", labelClass: "text-neutral-700" };
  if (status === "sold") return { dot: "bg-neutral-900", labelClass: "text-neutral-900" };
  return { dot: "bg-neutral-300", labelClass: "text-neutral-700" };
};

function reservationCardClass(unit: Unit) {
  const tone = getReservationTone(unit.reservationExpiresAt, unit.status);
  if (tone === "expired") return "border-red-300 bg-red-50/60";
  if (tone === "expiring") return "border-amber-300 bg-amber-50/60";
  if (tone === "active") return "border-amber-200 bg-white";
  return "border-neutral-200 bg-white";
}

export default function UnitsClient({ initialUnits, initialBuildings, projectId, currentUserId, managers }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [buildings] = useState<Building[]>(initialBuildings);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(initialBuildings[0]?.id || null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [reservationModal, setReservationModal] = useState<Unit | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [bulkPricing, setBulkPricing] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const isMounted = useRef(false);

  const loadUnits = (status: string, rooms: string) => {
    const qs = new URLSearchParams();
    qs.set("projectId", projectId);
    if (status) qs.set("status", status);
    if (rooms) qs.set("rooms", rooms);
    qs.set("all", "true");
    fetch(`/api/units?${qs}`)
      .then((r) => r.json())
      .then(setUnits);
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    loadUnits(filterStatus, filterRooms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterRooms]);

  const updateUnit = async (unitId: string, data: Record<string, unknown>) => {
    const previous = units.find((u) => u.id === unitId);
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, ...data } : u)));
    const res = await fetch(`/api/units/${unitId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok && previous) {
      setUnits((prev) => prev.map((u) => (u.id === unitId ? previous : u)));
    }
  };

  const handleStatusChange = (unit: Unit, newStatus: string) => {
    if (newStatus === "reserved") return;
    if (newStatus === "sold") {
      setReservationModal({ ...unit, status: newStatus });
    } else {
      updateUnit(unit.id, { status: newStatus, customerName: null, customerPhone: null, customerNotes: null });
    }
  };

  const createDealForUnit = async (unit: Unit, data: Record<string, unknown>) => {
    const customerName = String(data.customerName || "").trim();
    const customerPhone = String(data.customerPhone || "").trim();
    if (!customerName || !customerPhone) {
      alert(t("clientNamePhoneRequired"));
      return;
    }

    const clientRes = await fetch("/api/crm/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: customerName,
        phone: customerPhone,
        source: "unit_admin",
        notes: data.customerNotes || null,
      }),
    });
    const clientPayload = await clientRes.json();
    const clientId = clientRes.status === 409 ? clientPayload.clientId : clientPayload.id;
    if (!clientRes.ok && clientRes.status !== 409) throw new Error(clientPayload.error || t("failedCreateClient"));

    const pricePerM2 = unit.pricePerM2 || unit.floor.basePricePerM2 || 0;
    const listPrice = unit.totalPrice || pricePerM2 * unit.area;
    const dealRes = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        projectId,
        primaryUnitId: unit.id,
        listPrice,
        paymentTermMonths: 0,
        notes: data.customerNotes || null,
      }),
    });
    if (!dealRes.ok) {
      const payload = await dealRes.json().catch(() => null);
      throw new Error(payload?.error || t("failedCreateDeal"));
    }
    const deal = await dealRes.json();

    const reserveRes = await fetch(`/api/crm/deals/${deal.id}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: data.customerNotes || null }),
    });
    if (!reserveRes.ok) {
      const payload = await reserveRes.json().catch(() => null);
      throw new Error(payload?.error || t("failedReserveUnit"));
    }

    if (data.status === "sold") {
      const soldRes = await fetch(`/api/crm/deals/${deal.id}/mark-sold`, { method: "POST" });
      if (!soldRes.ok) {
        const payload = await soldRes.json().catch(() => null);
        throw new Error(payload?.error || t("failedMarkSold"));
      }
    }

    loadUnits(filterStatus, filterRooms);
  };

  const roomOptions = useMemo(() => {
    const rooms = new Set(units.map((u) => u.rooms));
    return Array.from(rooms).sort((a, b) => a - b);
  }, [units]);

  const buildingUnits = useMemo(() => {
    if (!selectedBuildingId) return [];
    return units.filter((u) => u.floor.building.id === selectedBuildingId);
  }, [units, selectedBuildingId]);

  const groupedByFloor = useMemo(() => {
    const groups: Record<number, Unit[]> = {};
    buildingUnits.forEach((unit) => {
      const floorNum = unit.floor.number;
      if (!groups[floorNum]) groups[floorNum] = [];
      groups[floorNum].push(unit);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([floor, floorUnits]) => ({ floor: parseInt(floor), units: floorUnits }));
  }, [buildingUnits]);

  const getBuildingStats = (buildingId: string) => {
    const bUnits = units.filter((u) => u.floor.building.id === buildingId);
    return {
      total: bUnits.length,
      available: bUnits.filter((u) => u.status === "available").length,
      reserved: bUnits.filter((u) => u.status === "reserved").length,
      sold: bUnits.filter((u) => u.status === "sold").length,
    };
  };

  return (
    <div className="space-y-5 text-neutral-950">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{t("manageUnits")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("unitAdminSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {buildings.map((building) => {
          const stats = getBuildingStats(building.id);
          const isSelected = selectedBuildingId === building.id;
          return (
            <button
              key={building.id}
              onClick={() => setSelectedBuildingId(building.id)}
              className={`rounded-[8px] border p-4 text-left transition ${
                isSelected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white hover:border-neutral-400"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{building.name}</h3>
                <span className={isSelected ? "text-sm text-neutral-300" : "text-sm text-neutral-500"}>{stats.total}</span>
              </div>
              <div className={`mt-3 grid grid-cols-3 gap-2 text-xs ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                <span>{stats.available} {t("available")}</span>
                <span>{stats.reserved} {t("reserved")}</span>
                <span>{stats.sold} {t("sold")}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-[6px] border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-500"
        >
          <option value="">{t("allStatus")}</option>
          <option value="available">{t("available")}</option>
          <option value="reserved">{t("reserved")}</option>
          <option value="sold">{t("sold")}</option>
        </select>
        <select
          value={filterRooms}
          onChange={(e) => setFilterRooms(e.target.value)}
          className="h-10 rounded-[6px] border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-500"
        >
          <option value="">{t("allRooms")}</option>
          {roomOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-sm text-neutral-500">{buildingUnits.length} {t("units")}</span>
      </div>

      {groupedByFloor.length === 0 ? (
        <div className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
          {t("noUnitsYet")}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByFloor.map(({ floor, units: floorUnits }) => (
            <div key={floor} className="overflow-hidden rounded-[8px] border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-950"
                    checked={floorUnits.length > 0 && floorUnits.every((u) => selectedUnits.includes(u.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUnits((prev) => Array.from(new Set([...prev, ...floorUnits.map((u) => u.id)])));
                      else setSelectedUnits((prev) => prev.filter((id) => !floorUnits.find((u) => u.id === id)));
                    }}
                  />
                  <h3 className="font-semibold text-neutral-900">{t("floor")} {floor}</h3>
                </div>
                <span className="text-xs text-neutral-500">{floorUnits.length} {t("units")}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {floorUnits.map((unit) => {
                  const pricePerM2 = unit.pricePerM2 || unit.floor.basePricePerM2 || 0;
                  const totalPrice = unit.totalPrice || pricePerM2 * unit.area;
                  const meta = statusMeta(unit.status);

                  return (
                    <div key={unit.id} className={`rounded-[7px] border p-3 transition hover:border-neutral-400 ${reservationCardClass(unit)}`}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-950"
                            checked={selectedUnits.includes(unit.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedUnits((prev) => [...prev, unit.id]);
                              else setSelectedUnits((prev) => prev.filter((id) => id !== unit.id));
                            }}
                          />
                          <span className="truncate text-[15px] font-semibold">№{unit.displayNumber}</span>
                        </div>
                        <select
                          value={unit.status}
                          onChange={(e) => handleStatusChange(unit, e.target.value)}
                          className={`rounded-[6px] border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium outline-none ${meta.labelClass}`}
                        >
                          <option value="available">{t("available")}</option>
                          <option value="reserved" disabled={unit.status !== "reserved"}>{t("reserved")}</option>
                          <option value="sold">{t("sold")}</option>
                        </select>
                      </div>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p>{unit.rooms} {t("rooms")} · {unit.area} m²</p>
                        <p className="font-medium text-neutral-900">{formatPrice(totalPrice)}</p>
                        <p className="inline-flex items-center gap-2 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {t(unit.status as "available" | "reserved" | "sold")}
                        </p>
                      </div>
                      {(unit.status === "reserved" || unit.status === "sold") && unit.customerName && (
                        <div className="mt-3 border-t border-neutral-200 pt-2 text-xs">
                          <p className="font-medium text-neutral-900">{unit.customerName}</p>
                          {unit.customerPhone && <p className="text-neutral-500">{unit.customerPhone}</p>}
                          {unit.customerNotes && <p className="truncate text-neutral-400">{unit.customerNotes}</p>}
                        </div>
                      )}
                      {unit.currentDeal && (
                        <div className="mt-3 border-t border-neutral-200 pt-2 text-xs">
                          <a
                            href={`/portal/management-x7k9/crm/deals/${unit.currentDeal.id}`}
                            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                          >
                            {unit.currentDeal.dealNumber} · {unit.currentDeal.status}
                          </a>
                          <p className="text-neutral-500">{unit.currentDeal.client.fullName}</p>
                          <p className="text-neutral-500">
                            {unit.currentDeal.salePrice.toLocaleString()} {unit.currentDeal.currency}
                          </p>
                          <p className="text-neutral-400">
                            {t("docs")} {unit.currentDeal.documents.length} · {t("payments")} {unit.currentDeal.paymentPlans[0]?.payments.length || 0}
                          </p>
                        </div>
                      )}
                      {unit.reservationExpiresAt && unit.status === "reserved" ? (
                        <div className="mt-3">
                          <ReservationCountdown
                            compact
                            status={unit.status}
                            expiresAt={unit.reservationExpiresAt}
                            href={unit.currentDeal ? `/portal/management-x7k9/crm/deals/${unit.currentDeal.id}` : undefined}
                          />
                        </div>
                      ) : null}
                      {unit.status === "available" ? (
                        <div className="mt-3 border-t border-neutral-200 pt-3">
                          <BronApartmentButton
                            unit={{
                              id: unit.id,
                              unitNumber: unit.unitNumber,
                              displayNumber: unit.displayNumber,
                              buildingName: unit.floor.building.name,
                              floorNumber: unit.floor.number,
                              rooms: unit.rooms,
                              area: unit.area,
                              totalPrice,
                              status: unit.status,
                            }}
                            projectId={projectId}
                            currentUserId={currentUserId}
                            managers={managers}
                            className="a-btn a-btn-primary !h-8 !px-3 text-xs"
                            onReserved={() => loadUnits(filterStatus, filterRooms)}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {reservationModal && (
        <ReservationModal
          unit={reservationModal}
          onClose={() => setReservationModal(null)}
          onSave={async (data) => {
            try {
              await createDealForUnit(reservationModal, data);
            } catch (error) {
              alert(error instanceof Error ? error.message : t("failedToSubmit"));
            }
            setReservationModal(null);
          }}
          translations={{
            reserve: t("reserve"),
            sell: t("sell"),
            customerName: t("customerName"),
            customerPhone: t("customerPhone"),
            customerNotes: t("customerNotes"),
            customerNamePlaceholder: t("customerNamePlaceholder"),
            customerNotesPlaceholder: t("customerNotesPlaceholder"),
            saving: t("saving"),
            cancel: tc("cancel"),
          }}
        />
      )}

      {selectedUnits.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-neutral-200 bg-white/95 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <span className="rounded-[6px] bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
                {t("selectedUnits", { count: selectedUnits.length })}
              </span>
              <button onClick={() => setSelectedUnits([])} className="text-sm font-semibold text-neutral-500 transition hover:text-neutral-900">
                {t("clearSelection")}
              </button>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="h-10 rounded-[6px] border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
              >
                <option value="">{t("changeStatus")}</option>
                <option value="available">{t("availableOption")}</option>
              </select>
              <input
                type="number"
                placeholder={t("newPricePerM2")}
                value={bulkPricing}
                onChange={(e) => setBulkPricing(e.target.value)}
                className="h-10 w-52 rounded-[6px] border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
              />
              <button
                onClick={async () => {
                  if (!bulkStatus && !bulkPricing) return alert(t("enterPriceOrStatus"));
                  setIsBulkLoading(true);
                  const data: Record<string, unknown> = {};
                  if (bulkStatus) data.status = bulkStatus;
                  if (bulkPricing) data.pricePerM2 = parseInt(bulkPricing);
                  const previousUnits = units.filter((u) => selectedUnits.includes(u.id));
                  setUnits((prev) => prev.map((u) => (selectedUnits.includes(u.id) ? { ...u, ...data } : u)));
                  setSelectedUnits([]);
                  setBulkStatus("");
                  setBulkPricing("");
                  try {
                    const res = await fetch("/api/units", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ unitIds: previousUnits.map((u) => u.id), data }),
                    });
                    if (!res.ok) {
                      previousUnits.forEach((prev) => {
                        setUnits((currentUnits) => currentUnits.map((u) => (u.id === prev.id ? prev : u)));
                      });
                    }
                  } catch {
                    previousUnits.forEach((prev) => {
                      setUnits((currentUnits) => currentUnits.map((u) => (u.id === prev.id ? prev : u)));
                    });
                    alert(t("failedToSubmit"));
                  } finally {
                    setIsBulkLoading(false);
                  }
                }}
                disabled={isBulkLoading || (!bulkStatus && !bulkPricing)}
                className="h-10 rounded-[6px] bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {isBulkLoading ? t("saving") : t("bulkSave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReservationModal({
  unit,
  onClose,
  onSave,
  translations: tr,
}: {
  unit: Unit;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  translations: {
    reserve: string;
    sell: string;
    customerName: string;
    customerPhone: string;
    customerNotes: string;
    customerNamePlaceholder: string;
    customerNotesPlaceholder: string;
    saving: string;
    cancel: string;
  };
}) {
  const [customerName, setCustomerName] = useState(unit.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(unit.customerPhone || "");
  const [customerNotes, setCustomerNotes] = useState(unit.customerNotes || "");
  const [saving, setSaving] = useState(false);
  const isReserved = unit.status === "reserved";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ status: unit.status, customerName: customerName || null, customerPhone: customerPhone || null, customerNotes: customerNotes || null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[8px] border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 text-xl font-semibold tracking-[-0.02em]">{isReserved ? tr.reserve : tr.sell} — №{unit.displayNumber}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{tr.customerName} *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="h-10 w-full rounded-[6px] border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
              placeholder={tr.customerNamePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{tr.customerPhone}</label>
            <input
              type="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              className="h-10 w-full rounded-[6px] border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500"
              placeholder="+998 XX XXX XX XX"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{tr.customerNotes}</label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-[6px] border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              placeholder={tr.customerNotesPlaceholder}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-[6px] border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
              {tr.cancel}
            </button>
            <button type="submit" disabled={saving} className="h-10 flex-1 rounded-[6px] bg-neutral-950 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">
              {saving ? tr.saving : isReserved ? tr.reserve : tr.sell}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
