"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";

interface Unit {
  id: string;
  unitNumber: string;
  rooms: number;
  area: number;
  status: string;
  pricePerM2: number | null;
  totalPrice: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerNotes: string | null;
  floor: {
    id: string;
    number: number;
    basePricePerM2: number | null;
    building: {
      id: string;
      name: string;
    };
  };
}

interface Building {
  id: string;
  name: string;
}

export default function AdminUnits() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const params = useParams();
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRooms, setFilterRooms] = useState("");
  const [reservationModal, setReservationModal] = useState<Unit | null>(null);

  // Load project data including buildings
  useEffect(() => {
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setBuildings(data.buildings || []);
        if (data.buildings?.length > 0 && !selectedBuildingId) {
          setSelectedBuildingId(data.buildings[0].id);
        }
      });
  }, [params.projectId]);

  // Load units
  const loadUnits = () => {
    const qs = new URLSearchParams();
    qs.set("projectId", params.projectId as string);
    if (filterStatus) qs.set("status", filterStatus);
    if (filterRooms) qs.set("rooms", filterRooms);
    fetch(`/api/units?${qs}`)
      .then((r) => r.json())
      .then(setUnits);
  };

  useEffect(() => {
    loadUnits();
  }, [filterStatus, filterRooms, params.projectId]);

  // Get dynamic filter options
  const roomOptions = useMemo(() => {
    const rooms = new Set(units.map((u) => u.rooms));
    return Array.from(rooms).sort((a, b) => a - b);
  }, [units]);

  // Filter units by selected building
  const buildingUnits = useMemo(() => {
    if (!selectedBuildingId) return [];
    return units.filter((u) => u.floor.building.id === selectedBuildingId);
  }, [units, selectedBuildingId]);

  // Group units by floor
  const groupedByFloor = useMemo(() => {
    const groups: Record<number, Unit[]> = {};
    buildingUnits.forEach((unit) => {
      const floorNum = unit.floor.number;
      if (!groups[floorNum]) groups[floorNum] = [];
      groups[floorNum].push(unit);
    });
    // Sort floors descending (top floor first)
    return Object.entries(groups)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([floor, units]) => ({ floor: parseInt(floor), units }));
  }, [buildingUnits]);

  const updateUnit = async (unitId: string, data: any) => {
    await fetch(`/api/units/${unitId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadUnits();
  };

  const handleStatusChange = (unit: Unit, newStatus: string) => {
    if (newStatus === "reserved" || newStatus === "sold") {
      // Open reservation modal to capture customer details
      setReservationModal({ ...unit, status: newStatus } as Unit);
    } else {
      // Set back to available - clear customer info
      updateUnit(unit.id, {
        status: newStatus,
        customerName: null,
        customerPhone: null,
        customerNotes: null,
      });
    }
  };

  // Building stats
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
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("manageUnits")}</h1>

      {/* Building Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {buildings.map((building) => {
          const stats = getBuildingStats(building.id);
          const isSelected = selectedBuildingId === building.id;
          return (
            <button
              key={building.id}
              onClick={() => setSelectedBuildingId(building.id)}
              className={`p-4 rounded-xl border-2 text-left transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300 bg-white"
              }`}
            >
              <h3 className="font-semibold text-lg">{building.name}</h3>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-emerald-600">{stats.available} {t("available")}</span>
                <span className="text-yellow-600">{stats.reserved} {t("reserved")}</span>
                <span className="text-red-600">{stats.sold} {t("sold")}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">{t("allStatus")}</option>
          <option value="available">{t("available")}</option>
          <option value="reserved">{t("reserved")}</option>
          <option value="sold">{t("sold")}</option>
        </select>

        <select
          value={filterRooms}
          onChange={(e) => setFilterRooms(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">{t("allRooms")}</option>
          {roomOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <span className="text-sm text-slate-500 ml-2">
          {buildingUnits.length} {t("units")}
        </span>
      </div>

      {/* Units grouped by floor */}
      {groupedByFloor.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
          {t("noUnitsYet")}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByFloor.map(({ floor, units: floorUnits }) => (
            <div key={floor} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">{t("floor")} {floor}</h3>
                <span className="text-xs text-slate-500">{floorUnits.length} {t("units")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                {floorUnits.map((unit) => {
                  const pricePerM2 = unit.pricePerM2 || unit.floor.basePricePerM2 || 0;
                  const totalPrice = unit.totalPrice || pricePerM2 * unit.area;
                  
                  return (
                    <div
                      key={unit.id}
                      className={`p-3 rounded-lg border ${
                        unit.status === "available"
                          ? "border-emerald-200 bg-emerald-50"
                          : unit.status === "reserved"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">№{unit.unitNumber}</span>
                        <select
                          value={unit.status}
                          onChange={(e) => handleStatusChange(unit, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                            unit.status === "available"
                              ? "bg-emerald-200 text-emerald-800"
                              : unit.status === "reserved"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          <option value="available">{t("available")}</option>
                          <option value="reserved">{t("reserved")}</option>
                          <option value="sold">{t("sold")}</option>
                        </select>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>{unit.rooms} {t("rooms")} · {unit.area} m²</p>
                        <p className="font-medium text-slate-800">{formatPrice(totalPrice)}</p>
                      </div>
                      {/* Customer info if reserved/sold */}
                      {(unit.status === "reserved" || unit.status === "sold") && unit.customerName && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                          <p className="font-medium">{unit.customerName}</p>
                          {unit.customerPhone && <p className="text-slate-500">{unit.customerPhone}</p>}
                          {unit.customerNotes && <p className="text-slate-400 truncate">{unit.customerNotes}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reservation Modal */}
      {reservationModal && (
        <ReservationModal
          unit={reservationModal}
          onClose={() => setReservationModal(null)}
          onSave={async (data) => {
            await updateUnit(reservationModal.id, data);
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
    </div>
  );
}

// Reservation/Sale Modal Component
function ReservationModal({
  unit,
  onClose,
  onSave,
  translations: tr,
}: {
  unit: Unit;
  onClose: () => void;
  onSave: (data: any) => void;
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
    await onSave({
      status: unit.status,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerNotes: customerNotes || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">
          {isReserved ? tr.reserve : tr.sell} — №{unit.unitNumber}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tr.customerName} {isReserved ? "" : "*"}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required={!isReserved}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder={tr.customerNamePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tr.customerPhone}
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="+998 90 123 45 67"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tr.customerNotes}
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg resize-none"
              placeholder={tr.customerNotesPlaceholder}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              {tr.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${
                isReserved
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-red-500 hover:bg-red-600"
              } disabled:opacity-50`}
            >
              {saving ? tr.saving : isReserved ? tr.reserve : tr.sell}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
