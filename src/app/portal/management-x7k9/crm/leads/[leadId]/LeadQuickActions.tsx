"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlarmClock, CalendarPlus, Handshake, MessageSquarePlus, NotebookPen, PhoneCall, PhoneOff, Send, Smartphone } from "lucide-react";
import { taskPriorityLabel, taskTypeLabel } from "@/lib/crm-labels";

type ReminderTaskType = "call" | "message" | "meeting" | "visit";
type ReminderPriority = "low" | "normal" | "high" | "urgent";

export default function LeadQuickActions({
  leadId,
  clientId,
  assignedToId,
  currentUserId,
  projectId,
  unitId,
  source,
  phone,
}: {
  leadId: string;
  clientId: string | null;
  assignedToId: string | null;
  currentUserId?: string;
  projectId?: string | null;
  unitId?: string | null;
  source?: string | null;
  phone?: string | null;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskType, setTaskType] = useState<ReminderTaskType>("call");
  const [taskPriority, setTaskPriority] = useState<ReminderPriority>("normal");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const ownerId = assignedToId || currentUserId;
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;

  const reminderPresets = [
    { key: "1h", label: t("remindIn1Hour"), type: "call" as const, priority: "high" as const, dueAt: () => new Date(Date.now() + 60 * 60 * 1000) },
    {
      key: "evening",
      label: t("remindTodayEvening"),
      type: "call" as const,
      priority: "normal" as const,
      dueAt: () => {
        const date = new Date();
        date.setHours(18, 0, 0, 0);
        if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
        return date;
      },
    },
    {
      key: "tomorrow",
      label: t("remindTomorrowMorning"),
      type: "call" as const,
      priority: "normal" as const,
      dueAt: () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0);
        return date;
      },
    },
    {
      key: "3d",
      label: t("remindIn3Days"),
      type: "call" as const,
      priority: "normal" as const,
      dueAt: () => {
        const date = new Date();
        date.setDate(date.getDate() + 3);
        date.setHours(10, 0, 0, 0);
        return date;
      },
    },
  ];

  async function logActivity(
    actionKey: string,
    type: "note" | "communication" | "meeting" | "visit",
    title: string,
    body?: string,
    channel: "phone" | "sms" | "telegram" | "manual" = type === "communication" ? "phone" : "manual"
  ) {
    setBusyAction(actionKey);
    const res = await fetch("/api/crm/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        body: body || null,
        leadId,
        clientId,
        channel,
        direction: type === "communication" ? "outbound" : "internal",
      }),
    });
    setBusyAction(null);
    if (res.ok) {
      setNote("");
      router.refresh();
    }
  }

  async function createReminder(
    actionKey: string,
    title: string,
    dueAt: Date | null,
    type: ReminderTaskType = "call",
    priority: ReminderPriority = "normal"
  ) {
    if (!ownerId) return;
    setBusyAction(actionKey);
    const res = await fetch("/api/crm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        leadId,
        clientId,
        assignedToId: ownerId,
        type,
        priority,
        dueAt: dueAt ? dueAt.toISOString() : null,
        activityTitle: t("reminderCreatedActivityTitle"),
        activityBody: t("reminderCreatedActivityBody"),
      }),
    });
    setBusyAction(null);
    if (res.ok) {
      setTaskTitle("");
      setTaskDueAt("");
      router.refresh();
    }
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    await createReminder("custom-reminder", taskTitle.trim(), taskDueAt ? new Date(taskDueAt) : null, taskType, taskPriority);
  }

  async function createDeal() {
    if (!clientId) {
      window.alert(t("needsClientForDeal"));
      return;
    }
    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        leadId,
        projectId: projectId || null,
        primaryUnitId: unitId || null,
        assignedToId: assignedToId || currentUserId || null,
        source: source || null,
        listPrice: 0,
      }),
    });
    if (res.ok) {
      const deal = await res.json();
      router.push(`/portal/management-x7k9/crm/deals/${deal.id}`);
    } else {
      const payload = await res.json().catch(() => null);
      window.alert(payload?.error || t("couldNotCreateDeal"));
    }
  }

  const disabled = Boolean(busyAction);

  return (
    <div className="a-card p-4 flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold">{t("quickActionsTitle")}</h2>
      <div className="flex gap-2 flex-wrap">
        {telHref ? (
          <a
            className={`a-btn ${disabled ? "pointer-events-none opacity-60" : ""}`}
            aria-disabled={disabled}
            href={telHref}
            onClick={() => void logActivity("call", "communication", t("activityCallLogged"))}
          >
            <PhoneCall className="w-3.5 h-3.5" /> {t("quickActionCall")}
          </a>
        ) : (
          <button className="a-btn" disabled={disabled} onClick={() => void logActivity("call", "communication", t("activityCallLogged"))}>
            <PhoneCall className="w-3.5 h-3.5" /> {t("quickActionCall")}
          </button>
        )}
        <button
          className="a-btn"
          disabled={disabled}
          onClick={() => void logActivity("no-answer", "communication", t("activityNoAnswerLogged"), t("activityNoAnswerBody"))}
        >
          <PhoneOff className="w-3.5 h-3.5" /> {t("quickActionNoAnswer")}
        </button>
        <button
          className="a-btn"
          disabled={disabled}
          onClick={() =>
            void logActivity(
              "sms",
              "communication",
              t("activitySmsLogged"),
              t("activitySmsBody"),
              "sms"
            )
          }
        >
          <Smartphone className="w-3.5 h-3.5" /> {t("quickActionSMS")}
        </button>
        <button
          className="a-btn"
          disabled={disabled}
          onClick={() =>
            void logActivity(
              "telegram",
              "communication",
              t("activityTelegramLogged"),
              t("activityTelegramBody"),
              "telegram"
            )
          }
        >
          <Send className="w-3.5 h-3.5" /> {t("quickActionTelegram")}
        </button>
        <button className="a-btn" disabled={disabled} onClick={() => void logActivity("meeting", "meeting", t("activityMeetingLogged"))}>
          <CalendarPlus className="w-3.5 h-3.5" /> {t("quickActionMeeting")}
        </button>
        <button className="a-btn" disabled={disabled} onClick={() => void logActivity("visit", "visit", t("activityVisitLogged"))}>
          <MessageSquarePlus className="w-3.5 h-3.5" /> {t("quickActionVisit")}
        </button>
        <button className="a-btn a-btn-primary" disabled={disabled} onClick={() => void createDeal()}>
          <Handshake className="w-3.5 h-3.5" /> {t("quickActionCreateDeal")}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[12px] font-semibold" style={{ color: "var(--a-text-secondary)" }}>{t("reminderPresetsTitle")}</div>
        <div className="flex gap-2 flex-wrap">
          {reminderPresets.map((preset) => (
            <button
              key={preset.key}
              className="a-btn"
              disabled={disabled || !ownerId}
              onClick={() => void createReminder(`reminder-${preset.key}`, t("reminderCallTitle"), preset.dueAt(), preset.type, preset.priority)}
            >
              <AlarmClock className="w-3.5 h-3.5" /> {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="a-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("addNotePlaceholder")} />
        <button className="a-btn" disabled={disabled || !note.trim()} onClick={() => void logActivity("note", "note", t("activityNoteLogged"), note)}>
          <NotebookPen className="w-3.5 h-3.5" /> {t("saveNote")}
        </button>
      </div>
      <form className="grid gap-2 md:grid-cols-[1fr_150px_140px_190px_auto]" onSubmit={createTask}>
        <input className="a-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("newFollowUpTask")} required />
        <select
          className="a-input"
          aria-label={t("customReminderType")}
          value={taskType}
          onChange={(event) => setTaskType(event.target.value as ReminderTaskType)}
        >
          {(["call", "message", "meeting", "visit"] as const).map((type) => (
            <option key={type} value={type}>{taskTypeLabel(t, type)}</option>
          ))}
        </select>
        <select
          className="a-input"
          aria-label={t("customReminderPriority")}
          value={taskPriority}
          onChange={(event) => setTaskPriority(event.target.value as ReminderPriority)}
        >
          {(["low", "normal", "high", "urgent"] as const).map((priority) => (
            <option key={priority} value={priority}>{taskPriorityLabel(t, priority)}</option>
          ))}
        </select>
        <input className="a-input" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
        <button className="a-btn a-btn-primary" disabled={disabled || !ownerId} type="submit">
          {busyAction === "custom-reminder" ? t("quickActionBusy") : t("createTask")}
        </button>
      </form>
    </div>
  );
}
