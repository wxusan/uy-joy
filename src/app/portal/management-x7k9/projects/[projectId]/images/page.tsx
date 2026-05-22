import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";

export default async function ProjectImagesPage() {
  await requireAdmin(PLATFORM_PERMISSIONS.manageInventory);
  redirect("/portal/management-x7k9/projects");
}
