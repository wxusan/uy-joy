import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canViewAllLeads, taskVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.manageLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const user = session.user as { id?: string; role?: string };
  const canReassignTasks = canViewAllLeads(user);
  const visibility = taskVisibilityWhere(user, settings.allowAgentClaim);
  const requestedView = paramValue(searchParams?.view);
  const initialView =
    requestedView === "overdue" || requestedView === "today" || requestedView === "week" || requestedView === "backup" || requestedView === "all"
      ? requestedView
      : "my";
  const initialTypeFilter = paramValue(searchParams?.type) || "all";
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const taskWhere = {
    AND: [
      visibility,
      initialView === "overdue" ? { status: "open", dueAt: { lt: now } } : {},
      initialView === "today" ? { status: "open", dueAt: { gte: todayStart, lte: todayEnd } } : {},
      initialView === "week" ? { status: "open", dueAt: { lte: weekEnd } } : {},
      initialTypeFilter === "office_visit"
        ? { type: { in: ["meeting", "visit"] } }
        : initialTypeFilter !== "all"
          ? { type: initialTypeFilter }
          : {},
    ],
  };
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
    where: taskWhere,
    include: {
      client: { select: { id: true, fullName: true } },
      lead: {
        select: {
          id: true,
          name: true,
          status: true,
          assignedToId: true,
          assignedToUser: { select: { id: true, name: true, email: true } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["developer", "owner", "sales_director", "sales_agent", "external_agent", "finance"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedTasks = tasks.map((task) => ({
    ...task,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  return (
    <TasksClient
      initialTasks={serializedTasks}
      users={users}
      currentUserId={user.id}
      canReassignTasks={canReassignTasks}
      initialView={initialView}
      initialTypeFilter={initialTypeFilter}
    />
  );
}
