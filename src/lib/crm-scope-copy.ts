import { normalizePlatformRole } from "./platform-plans";

export function getCrmScopeEmptyMessage(role: string | null | undefined) {
  const normalizedRole = normalizePlatformRole(role);

  if (normalizedRole === "marketing") {
    return "Marketing CRM scope is not active yet. Source and campaign views will land with marketing reports.";
  }

  if (normalizedRole === "back_office") {
    return "Back-office CRM scope is not active yet. Payment and document-linked client access will appear with those workflows.";
  }

  return null;
}
