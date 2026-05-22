import { Prisma } from "@prisma/client";
import { normalizePlatformRole, roleHasPlatformPermission } from "./platform-plans";

export type CrmUser = {
  id?: string;
  role?: string;
};

export function canViewAllLeads(user: CrmUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "manageUsers") || user?.role === "sales_director";
}

export function canViewReadOnlyCrm(user: CrmUser | null | undefined) {
  return roleHasPlatformPermission(user?.role, "viewLeads");
}

function isSpecialistReadOnlyRole(user: CrmUser | null | undefined) {
  const role = normalizePlatformRole(user?.role);
  return role === "back_office" || role === "marketing";
}

function isLinkedCrmReadOnlyRole(user: CrmUser | null | undefined) {
  const role = user?.role;
  return role === "back_office" || role === "finance" || role === "legal";
}

function linkedLeadWhere(): Prisma.LeadWhereInput {
  return {
    OR: [
      { deals: { some: {} } },
      { documents: { some: {} } },
      {
        client: {
          is: {
            OR: [
              { deals: { some: {} } },
              { payments: { some: {} } },
              { refunds: { some: {} } },
              { documents: { some: {} } },
              { reservedUnits: { some: {} } },
              { soldUnits: { some: {} } },
            ],
          },
        },
      },
    ],
  };
}

function linkedClientWhere(): Prisma.ClientWhereInput {
  return {
    OR: [
      { deals: { some: {} } },
      { payments: { some: {} } },
      { refunds: { some: {} } },
      { documents: { some: {} } },
      { reservedUnits: { some: {} } },
      { soldUnits: { some: {} } },
    ],
  };
}

export function canEditLead(user: CrmUser | null | undefined, lead: { assignedToId?: string | null }) {
  if (!user) return false;
  if (canViewAllLeads(user)) return true;
  return user.role === "sales_agent" && Boolean(user.id) && lead.assignedToId === user.id;
}

export function leadVisibilityWhere(user: CrmUser | null | undefined, allowAgentClaim: boolean): Prisma.LeadWhereInput {
  if (!user) return { id: "__none__" };
  if (canViewAllLeads(user) || roleHasPlatformPermission(user.role, "viewReports")) return {};
  if (user.role === "sales_agent" && user.id) {
    return {
      OR: [{ assignedToId: user.id }, ...(allowAgentClaim ? [{ assignedToId: null }] : [])],
    };
  }
  if (canViewReadOnlyCrm(user)) {
    if (isLinkedCrmReadOnlyRole(user)) return linkedLeadWhere();
    return isSpecialistReadOnlyRole(user) ? { id: "__none__" } : {};
  }
  return { id: "__none__" };
}

export function clientVisibilityWhere(user: CrmUser | null | undefined, allowAgentClaim: boolean): Prisma.ClientWhereInput {
  if (!user) return { id: "__none__" };
  if (canViewAllLeads(user) || roleHasPlatformPermission(user.role, "viewReports")) return {};
  if (user.role === "sales_agent" && user.id) {
    return {
      OR: [{ assignedToId: user.id }, { leads: { some: leadVisibilityWhere(user, allowAgentClaim) } }],
    };
  }
  if (canViewReadOnlyCrm(user)) {
    if (isLinkedCrmReadOnlyRole(user)) return linkedClientWhere();
    return isSpecialistReadOnlyRole(user) ? { id: "__none__" } : {};
  }
  return { id: "__none__" };
}

export function taskVisibilityWhere(user: CrmUser | null | undefined, allowAgentClaim: boolean): Prisma.TaskWhereInput {
  if (!user) return { id: "__none__" };
  if (canViewAllLeads(user) || roleHasPlatformPermission(user.role, "viewReports")) return {};
  if (user.role === "sales_agent" && user.id) {
    return {
      OR: [
        { assignedToId: user.id },
        { createdById: user.id },
        { lead: { is: leadVisibilityWhere(user, allowAgentClaim) } },
        { client: { is: clientVisibilityWhere(user, allowAgentClaim) } },
      ],
    };
  }
  if (canViewReadOnlyCrm(user)) {
    if (isLinkedCrmReadOnlyRole(user)) {
      return { OR: [{ lead: { is: linkedLeadWhere() } }, { client: { is: linkedClientWhere() } }, { deal: { is: {} } }] };
    }
    return isSpecialistReadOnlyRole(user) ? { id: "__none__" } : {};
  }
  return { id: "__none__" };
}

export function activityVisibilityWhere(user: CrmUser | null | undefined, allowAgentClaim: boolean): Prisma.ActivityWhereInput {
  if (!user) return { id: "__none__" };
  if (canViewAllLeads(user) || roleHasPlatformPermission(user.role, "viewReports")) return {};
  if (user.role === "sales_agent" && user.id) {
    return {
      OR: [
        { actorId: user.id },
        { assignedToId: user.id },
        { lead: { is: leadVisibilityWhere(user, allowAgentClaim) } },
        { client: { is: clientVisibilityWhere(user, allowAgentClaim) } },
      ],
    };
  }
  if (canViewReadOnlyCrm(user)) {
    if (isLinkedCrmReadOnlyRole(user)) {
      return { OR: [{ lead: { is: linkedLeadWhere() } }, { client: { is: linkedClientWhere() } }, { deal: { is: {} } }] };
    }
    return isSpecialistReadOnlyRole(user) ? { id: "__none__" } : {};
  }
  return { id: "__none__" };
}
