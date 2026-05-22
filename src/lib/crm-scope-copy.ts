import { normalizePlatformRole } from "./platform-plans";

export function getCrmScopeEmptyMessage(role: string | null | undefined) {
  const normalizedRole = normalizePlatformRole(role);

  if (normalizedRole === "marketing") {
    return "Marketing CRM scope is not active yet. Source and campaign views will land with marketing reports.";
  }

  if (normalizedRole === "finance") {
    return "Finance can see CRM records linked to deals, payments, reservations, and documents.";
  }

  return null;
}
