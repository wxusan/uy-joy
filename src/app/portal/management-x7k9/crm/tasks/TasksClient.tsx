"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  client: { id: string; fullName: string } | null;
  lead: { id: string; name: string; status: string } | null;
  assignedTo: { id: string; name: string | null };
};

type User = { id: string; name: string | null; email: string; role: string };

export default function TasksClient({ initialTasks, users, currentUserId }: { initialTasks: Task[]; users: User[]; currentUserId?: string }) {
  const t = useTranslations("admin");
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"my" | "overdue" | "today" | "week" | "all">("my");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    assignedToId: currentUserId || users[0]?.id || "",
    priority: "normal",
    type: "call",
    dueAt: "",
  });
  const dateBounds = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    return { now, endOfToday, endOfWeek };
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const due = task.dueAt ? new Date(task.dueAt) : null;
      if (view === "my") return task.assignedTo.id === currentUserId && task.status === "open";
      if (view === "overdue") return task.status === "open" && Boolean(due && due < dateBounds.now);
      if (view === "today") return task.status === "open" && Boolean(due && due <= dateBounds.endOfToday);
      if (view === "week") return task.status === "open" && Boolean(due && due <= dateBounds.endOfWeek);
      return true;
    });
  }, [currentUserId, dateBounds, tasks, view]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/crm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      }),
    });
    if (!res.ok) return;
    const task = await res.json();
    setTasks((items) => [task, ...items]);
    setForm({ title: "", assignedToId: currentUserId || users[0]?.id || "", priority: "normal", type: "call", dueAt: "" });
    setShowForm(false);
  }

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    const previous = tasks;
    setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
    const res = await fetch(`/api/crm/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((items) => items.map((task) => (task.id === taskId ? updated : task)));
    } else {
      setTasks(previous);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="a-page-title">{t("tasksTitle")}</h1>
          <p className="a-page-sub">{t("tasksSubtitle")}</p>
        </div>
        <button className={showForm ? "a-btn" : "a-btn a-btn-primary"} onClick={() => setShowForm((value) => !value)}>
          {showForm ? t("cancel") : <><Plus className="w-3.5 h-3.5" /> {t("newTask")}</>}
        </button>
      </div>

      {showForm ? (
        <form className="a-card p-4 grid gap-3 md:grid-cols-[1fr_180px_140px_160px_auto]" onSubmit={createTask}>
          <input className="a-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t("taskTitle")} required />
          <select className="a-input" value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
          </select>
          <select className="a-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            {["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          <input className="a-input" type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
          <button className="a-btn a-btn-primary" type="submit">{t("create")}</button>
        </form>
      ) : null}

      <div className="flex gap-2 flex-wrap">
        {(["my", "overdue", "today", "week", "all"] as const).map((item) => (
          <button key={item} className={`a-btn ${view === item ? "a-btn-primary" : ""}`} onClick={() => setView(item)}>
            {item === "my" ? t("myTasks") : item === "overdue" ? t("overdue") : item === "today" ? t("today") : item === "week" ? t("week") : t("allTasks")}
          </button>
        ))}
      </div>

      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[860px]">
          <thead>
            <tr><th>{t("task")}</th><th>{t("client")}</th><th>{t("leadCol")}</th><th>{t("assigned")}</th><th>{t("priority")}</th><th>{t("status")}</th><th style={{ textAlign: "right" }}>{t("due")}</th><th /></tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id}>
                <td className="font-medium">{task.title}</td>
                <td>{task.client ? <Link className="hover:underline" href={`/portal/management-x7k9/crm/clients/${task.client.id}`}>{task.client.fullName}</Link> : "—"}</td>
                <td>{task.lead ? <Link className="hover:underline" href={`/portal/management-x7k9/crm/leads/${task.lead.id}`}>{task.lead.name}</Link> : "—"}</td>
                <td>{task.assignedTo.name}</td>
                <td>{task.priority}</td>
                <td>{task.status}</td>
                <td style={{ textAlign: "right" }}>{task.dueAt ? new Date(task.dueAt).toLocaleString() : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  {task.status === "open" ? (
                    <button className="a-btn !h-7 !px-2" onClick={() => void updateTask(task.id, { status: "completed" })}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
