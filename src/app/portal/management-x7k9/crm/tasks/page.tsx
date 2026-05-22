import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canViewAllLeads, leadVisibilityWhere } from "@/lib/crm-access";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.manageLeads);
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "crm")) return null;

  const user = session.user as { id?: string; role?: string };
  const visibility = canViewAllLeads(user)
    ? {}
    : { OR: [{ assignedToId: user.id }, { createdById: user.id }, { lead: { is: leadVisibilityWhere(user, settings.allowAgentClaim) } }] };
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
    where: visibility,
    include: {
      client: { select: { id: true, fullName: true } },
      lead: { select: { id: true, name: true, status: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["developer", "owner", "admin", "sales_director", "sales_agent", "superadmin"] } },
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

  return <TasksClient initialTasks={serializedTasks} users={users} currentUserId={user.id} />;
}
