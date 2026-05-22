"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Handshake, MessageSquarePlus, NotebookPen, PhoneCall, Send, Smartphone } from "lucide-react";

export default function LeadQuickActions({
  leadId,
  clientId,
  assignedToId,
  currentUserId,
  projectId,
  unitId,
  source,
}: {
  leadId: string;
  clientId: string | null;
  assignedToId: string | null;
  currentUserId?: string;
  projectId?: string | null;
  unitId?: string | null;
  source?: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  async function logActivity(
    type: "note" | "communication" | "meeting" | "visit",
    title: string,
    body?: string,
    channel: "phone" | "sms" | "telegram" | "manual" = type === "communication" ? "phone" : "manual"
  ) {
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
    if (res.ok) {
      setNote("");
      router.refresh();
    }
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    const ownerId = assignedToId || currentUserId;
    if (!ownerId) return;
    const res = await fetch("/api/crm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle,
        leadId,
        clientId,
        assignedToId: ownerId,
        type: "call",
        priority: "normal",
        dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
      }),
    });
    if (res.ok) {
      setTaskTitle("");
      setTaskDueAt("");
      router.refresh();
    }
  }

  async function createDeal() {
    if (!clientId) {
      window.alert("This lead needs a client before creating a deal.");
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
      window.alert(payload?.error || "Could not create deal");
    }
  }

  return (
    <div className="a-card p-4 flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold">Quick actions</h2>
      <div className="flex gap-2 flex-wrap">
        <button className="a-btn" onClick={() => void logActivity("communication", "Outbound call logged")}>
          <PhoneCall className="w-3.5 h-3.5" /> Call
        </button>
        <button
          className="a-btn"
          onClick={() =>
            void logActivity(
              "communication",
              "SMS draft sent",
              "Demo SMS: Assalomu alaykum, siz tanlagan xonadon bo'yicha savdo bo'limi bog'lanmoqda.",
              "sms"
            )
          }
        >
          <Smartphone className="w-3.5 h-3.5" /> SMS
        </button>
        <button
          className="a-btn"
          onClick={() =>
            void logActivity(
              "communication",
              "Telegram follow-up sent",
              "Demo Telegram follow-up logged. Real Telegram/SMS delivery can be connected later through provider APIs.",
              "telegram"
            )
          }
        >
          <Send className="w-3.5 h-3.5" /> Telegram
        </button>
        <button className="a-btn" onClick={() => void logActivity("meeting", "Meeting logged")}>
          <CalendarPlus className="w-3.5 h-3.5" /> Meeting
        </button>
        <button className="a-btn" onClick={() => void logActivity("visit", "Visit logged")}>
          <MessageSquarePlus className="w-3.5 h-3.5" /> Visit
        </button>
        <button className="a-btn a-btn-primary" onClick={() => void createDeal()}>
          <Handshake className="w-3.5 h-3.5" /> Create deal
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input className="a-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add note" />
        <button className="a-btn" disabled={!note.trim()} onClick={() => void logActivity("note", "Note added", note)}>
          <NotebookPen className="w-3.5 h-3.5" /> Save note
        </button>
      </div>
      <form className="grid gap-2 md:grid-cols-[1fr_190px_auto]" onSubmit={createTask}>
        <input className="a-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="New follow-up task" required />
        <input className="a-input" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
        <button className="a-btn a-btn-primary" type="submit">Create task</button>
      </form>
    </div>
  );
}
