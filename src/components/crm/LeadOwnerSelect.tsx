"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type ManagerOption = {
  id: string;
  name: string | null;
  email: string | null;
};

type AssignedUser = ManagerOption | null;

type Props = {
  leadId: string;
  assignedToId: string | null;
  managers: ManagerOption[];
  canAssign: boolean;
  compact?: boolean;
  onChanged?: (assignedToId: string | null, assignedToUser: AssignedUser) => void;
};

function managerLabel(manager: ManagerOption) {
  return manager.name || manager.email || manager.id;
}

export default function LeadOwnerSelect({ leadId, assignedToId, managers, canAssign, compact, onChanged }: Props) {
  const t = useTranslations("admin");
  const [value, setValue] = useState(assignedToId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assignLead(nextValue: string) {
    const previous = value;
    setValue(nextValue);
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: nextValue || null }),
    });

    if (!res.ok) {
      setValue(previous);
      setError(t("assignmentFailed"));
      setSaving(false);
      return;
    }

    const updated = await res.json();
    onChanged?.(updated.assignedToId || null, updated.assignedToUser || null);
    setSaving(false);
  }

  if (!canAssign) {
    const manager = managers.find((item) => item.id === assignedToId);
    return <span>{manager ? managerLabel(manager) : t("unassigned")}</span>;
  }

  return (
    <div className={compact ? "min-w-[160px]" : "flex flex-col gap-1"}>
      <select
        className="a-input"
        value={value}
        disabled={saving}
        onChange={(event) => void assignLead(event.target.value)}
        style={{
          height: compact ? 26 : 32,
          minWidth: compact ? 150 : 220,
          padding: "0 8px",
          fontSize: compact ? 12 : 13,
        }}
        aria-label={t("assigned")}
      >
        <option value="">{t("unassigned")}</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {managerLabel(manager)}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-[11px]" style={{ color: "#b42318" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
