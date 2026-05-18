import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function ProjectImagesPage() {
  await requireAdmin();
  redirect("/portal/management-x7k9/projects");
}
