"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical, UserPlus } from "lucide-react";
import { getLeadStatusTone } from "@/lib/lead-status";

type Stage = { id: string; key: string; name: string; color: string | null };
type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  projectName: string | null;
  unitNumber: string | null;
  updatedAt: string | Date;
  client: { id: string; fullName: string; phone: string } | null;
  assignedToUser: { id: string; name: string | null; email: string | null } | null;
  tasks: { id: string; title: string; dueAt: string | Date | null }[];
};

export default function PipelineBoard({
  initialStages,
  initialLeads,
  canClaim,
}: {
  initialStages: Stage[];
  initialLeads: Lead[];
  canClaim: boolean;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.client?.fullName, lead.name, lead.client?.phone, lead.phone, lead.projectName, lead.unitNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [leads, query]);
  const grouped = useMemo(
    () => Object.fromEntries(initialStages.map((stage) => [stage.key, visibleLeads.filter((lead) => lead.status === stage.key)])),
    [initialStages, visibleLeads]
  );

  async function moveLead(leadId: string, status: string) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;
    const lostReason = status === "lost" ? window.prompt("Why was this lead lost?")?.trim() : undefined;
    if (status === "lost" && !lostReason) return;
    const previous = leads;
    setMovingId(leadId);
    setLeads((items) => items.map((item) => (item.id === leadId ? { ...item, status } : item)));
    const res = await fetch(`/api/crm/pipeline/leads/${leadId}/stage`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, updatedAt: new Date(lead.updatedAt).toISOString(), lostReason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads((items) => items.map((item) => (item.id === leadId ? { ...item, ...updated } : item)));
    } else {
      const payload = await res.json().catch(() => null);
      if (res.status === 409 && payload?.lead) {
        window.alert("Lead was updated by someone else. Refreshing that card.");
        setLeads((items) => items.map((item) => (item.id === leadId ? { ...item, ...payload.lead } : item)));
      } else {
        setLeads(previous);
      }
    }
    setMovingId(null);
  }

  async function claimLead(leadId: string) {
    const res = await fetch(`/api/crm/leads/${leadId}/claim`, { method: "POST" });
    if (!res.ok) return;
    const updated = await res.json();
    setLeads((items) => items.map((item) => (item.id === leadId ? { ...item, ...updated } : item)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className="a-input max-w-[360px]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pipeline"
        />
      </div>
      <div className="overflow-x-auto pb-2">
      <div className="grid gap-3 min-w-[1120px]" style={{ gridTemplateColumns: `repeat(${initialStages.length}, minmax(150px, 1fr))` }}>
        {initialStages.map((stage) => (
          <section
            key={stage.key}
            className="a-card min-h-[520px] p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const leadId = event.dataTransfer.getData("text/plain");
              void moveLead(leadId, stage.key);
            }}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <div className="flex items-center gap-2">
                <span className="a-dot" style={{ color: stage.color || getLeadStatusTone(stage.key) }} />
                <h2 className="text-[13px] font-semibold">{stage.name}</h2>
              </div>
              <span className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>{grouped[stage.key]?.length || 0}</span>
            </div>
            <div className="flex flex-col gap-2">
              {(grouped[stage.key] || []).map((lead) => (
                <article
                  key={lead.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)}
                  className="rounded border p-3 bg-white flex flex-col gap-2"
                  style={{ borderColor: "var(--a-border)", opacity: movingId === lead.id ? 0.55 : 1 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/portal/management-x7k9/crm/leads/${lead.id}`} className="text-[13px] font-semibold hover:underline">
                      {lead.client?.fullName || lead.name}
                    </Link>
                    <GripVertical className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--a-text-tertiary)" }} />
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
                    {lead.client?.phone || lead.phone}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--a-text-tertiary)" }}>
                    {[lead.projectName, lead.unitNumber].filter(Boolean).join(" · ") || "No unit selected"}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>
                      {lead.assignedToUser?.name || "Unassigned"}
                    </span>
                    {canClaim && !lead.assignedToUser ? (
                      <button className="a-btn !h-7 !px-2" title="Claim lead" onClick={() => void claimLead(lead.id)}>
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}
