import prisma from "@/lib/prisma";
import { getDefaultProject, getPublicPageConfig, translatePublicText } from "@/lib/public-page";
import EmbedLeadFormClient from "./EmbedLeadFormClient";

export const dynamic = "force-dynamic";

export default async function EmbedLeadFormPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; source?: string; locale?: string }>;
}) {
  const params = await searchParams;
  const project = params.projectId
    ? await prisma.project.findUnique({ where: { id: params.projectId } })
    : await getDefaultProject();
  if (!project) return null;
  const publicPage = await getPublicPageConfig(project.id);
  const thankYouMessage =
    translatePublicText(publicPage?.config?.thankYouMessageJson, params.locale || "uz", "") ||
    "Our manager will contact you shortly.";

  return (
    <EmbedLeadFormClient
      projectId={project.id}
      projectName={publicPage?.config?.brandName || project.name}
      source={params.source || "client_site"}
      thankYouMessage={thankYouMessage}
    />
  );
}
