"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, GripVertical, Phone, UserPlus } from "lucide-react";
import { getLeadStatusTone } from "@/lib/lead-status";
import { leadSourceLabelUi, pipelineStageLabel } from "@/lib/crm-labels";
import { useLocale, useTranslations } from "next-intl";

type Stage = { id: string; key: string; name: string; color: string | null };
type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  projectName: string | null;
  unitNumber: string | null;
  unitNumberSnapshot?: string | null;
  buildingNameSnapshot?: string | null;
  floorNumberSnapshot?: number | null;
  source?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastContactedAt?: string | Date | null;
  nextActionAt?: string | Date | null;
  firstResponseAt?: string | Date | null;
  client: { id: string; fullName: string; phone: string } | null;
  assignedToUser: { id: string; name: string | null; email: string | null } | null;
  tasks: { id: string; title: string; dueAt: string | Date | null }[];
};

type PipelineFilter = "all" | "mine" | "unassigned" | "today" | "overdue" | "no_answer" | "bron";

const asDate = (value: string | Date | null | undefined) => (value ? new Date(value) : null);

export default function PipelineBoard({
  initialStages,
  initialLeads,
  canClaim,
  currentUserId,
}: {
  initialStages: Stage[];
  initialLeads: Lead[];
  canClaim: boolean;
  currentUserId: string | null;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [leads, setLeads] = useState(initialLeads);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PipelineFilter>("all");
  const now = useMemo(() => new Date(), []);
  const todayBounds = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, []);

  const isOverdue = useCallback((lead: Lead) => {
    const nextAction = asDate(lead.nextActionAt) || asDate(lead.tasks[0]?.dueAt);
    return Boolean(nextAction && nextAction < now && lead.status !== "sold" && lead.status !== "lost");
  }, [now]);
  const isToday = useCallback((lead: Lead) => {
    const nextAction = asDate(lead.nextActionAt) || asDate(lead.tasks[0]?.dueAt) || asDate(lead.createdAt);
    return Boolean(nextAction && nextAction >= todayBounds.start && nextAction < todayBounds.end);
  }, [todayBounds]);
  const isStale = (lead: Lead) => {
    if (lead.status === "sold" || lead.status === "lost") return false;
    const lastContactedAt = asDate(lead.lastContactedAt);
    if (!lastContactedAt) return !lead.firstResponseAt;
    return now.getTime() - lastContactedAt.getTime() > 48 * 60 * 60 * 1000;
  };
  const leadApartmentLabel = (lead: Lead) =>
    [
      lead.buildingNameSnapshot,
      lead.floorNumberSnapshot != null ? `${t("floorLabel")} ${lead.floorNumberSnapshot}` : null,
      lead.unitNumberSnapshot || lead.unitNumber,
    ].filter(Boolean).join(" · ") || t("noUnitSelected");
  const formatDateTime = (value: string | Date | null | undefined) => {
    const date = asDate(value);
    return date ? date.toLocaleString() : t("pipelineNoDate");
  };
  const formatShortDate = (value: string | Date | null | undefined) => {
    const date = asDate(value);
    return date ? date.toLocaleDateString() : t("pipelineNoDate");
  };
  const urgencyBadges = (lead: Lead) => [
    !lead.firstResponseAt ? { key: "no_answer", label: t("pipelineBadgeNoAnswer"), tone: "var(--a-danger)" } : null,
    isOverdue(lead) ? { key: "overdue", label: t("pipelineBadgeOverdue"), tone: "var(--a-danger)" } : null,
    !isOverdue(lead) && isToday(lead) ? { key: "today", label: t("pipelineBadgeToday"), tone: "var(--a-warning)" } : null,
    isStale(lead) ? { key: "stale", label: t("pipelineBadgeStale"), tone: "var(--a-warning)" } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; tone: string }>;

  const filterOptions: Array<{ key: PipelineFilter; label: string }> = [
    { key: "all", label: t("pipelineFilterAll") },
    { key: "mine", label: t("pipelineFilterMine") },
    { key: "unassigned", label: t("pipelineFilterUnassigned") },
    { key: "today", label: t("pipelineFilterToday") },
    { key: "overdue", label: t("pipelineFilterOverdue") },
    { key: "no_answer", label: t("pipelineFilterNoAnswer") },
    { key: "bron", label: t("pipelineFilterBron") },
  ];

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter === "mine" && lead.assignedToUser?.id !== currentUserId) return false;
      if (filter === "unassigned" && lead.assignedToUser) return false;
      if (filter === "today" && !isToday(lead)) return false;
      if (filter === "overdue" && !isOverdue(lead)) return false;
      if (filter === "no_answer" && lead.firstResponseAt) return false;
      if (filter === "bron" && lead.status !== "reserved") return false;
      if (!q) return true;
      return [lead.client?.fullName, lead.name, lead.client?.phone, lead.phone, lead.projectName, lead.unitNumber, lead.unitNumberSnapshot, lead.buildingNameSnapshot, lead.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [currentUserId, filter, isOverdue, isToday, leads, query]);
  const grouped = useMemo(
    () => Object.fromEntries(initialStages.map((stage) => [stage.key, visibleLeads.filter((lead) => lead.status === stage.key)])),
    [initialStages, visibleLeads]
  );

  async function moveLead(leadId: string, status: string) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;
    const lostReason = status === "lost" ? window.prompt(t("lostReasonPrompt"))?.trim() : undefined;
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
        window.alert(t("pipelineConflictAlert"));
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
      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="a-input max-w-[360px] min-w-[220px]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPipeline")}
        />
        <div className="flex gap-2 overflow-x-auto py-1">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              className={`a-btn whitespace-nowrap ${filter === option.key ? "a-btn-primary" : ""}`}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-1 gap-3 md:grid-flow-col md:auto-cols-[minmax(250px,280px)] md:min-w-max">
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
                <h2 className="text-[13px] font-semibold">{pipelineStageLabel(t, stage)}</h2>
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
                  <div className="flex flex-wrap gap-1">
                    {urgencyBadges(lead).map((badge) => (
                      <span key={badge.key} className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--a-bg-active)", color: badge.tone }}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[12px]" style={{ color: "var(--a-text-secondary)" }}>
                    <Phone className="w-3 h-3" /> {lead.client?.phone || lead.phone}
                  </div>
                  <dl className="grid gap-1 text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardApartment")}</dt><dd className="text-right">{leadApartmentLabel(lead)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardSource")}</dt><dd className="text-right">{leadSourceLabelUi(lead.source, locale)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("status")}</dt><dd className="text-right">{pipelineStageLabel(t, stage)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardManager")}</dt><dd className="text-right">{lead.assignedToUser?.name || t("unassigned")}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardLastContact")}</dt><dd className="text-right">{lead.lastContactedAt ? formatShortDate(lead.lastContactedAt) : t("pipelineNeverContacted")}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardNextAction")}</dt><dd className="text-right">{formatDateTime(lead.nextActionAt || lead.tasks[0]?.dueAt)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>{t("pipelineCardCreated")}</dt><dd className="text-right">{formatShortDate(lead.createdAt)}</dd></div>
                  </dl>
                  {lead.tasks[0] ? (
                    <div className="flex items-start gap-1 rounded px-2 py-1 text-[11px]" style={{ background: "var(--a-bg-subtle)", color: "var(--a-text-secondary)" }}>
                      <AlarmClock className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{lead.tasks[0].title}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px]" style={{ color: "var(--a-text-tertiary)" }}>
                      {movingId === lead.id ? t("quickActionBusy") : ""}
                    </span>
                    {canClaim && !lead.assignedToUser ? (
                      <button className="a-btn !h-7 !px-2" title={t("claimLead")} onClick={() => void claimLead(lead.id)}>
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              {(grouped[stage.key] || []).length === 0 ? (
                <div className="rounded border border-dashed p-4 text-center text-[12px]" style={{ borderColor: "var(--a-border)", color: "var(--a-text-tertiary)" }}>
                  {t("pipelineNoCards")}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}
