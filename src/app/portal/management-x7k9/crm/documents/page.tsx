import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { documentStatusLabel, documentTypeLabel } from "@/lib/crm-labels";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { canManageDocuments, dealVisibilityWhere } from "@/lib/real-estate";
import { getPlatformSettings, platformSettingsHasFeature } from "@/lib/platform-settings";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await requireAdmin(PLATFORM_PERMISSIONS.viewDeals);
  const t = await getTranslations("admin");
  const settings = getPlatformSettings();
  if (!platformSettingsHasFeature(settings, "documents")) return null;
  const user = session.user as { id?: string; role?: string };

  const documents = await prisma.document.findMany({
    where: canManageDocuments(user)
      ? {}
      : {
          OR: [
            { deal: { is: dealVisibilityWhere(user) } },
            { payment: { is: { deal: { is: dealVisibilityWhere(user) } } } },
          ],
        },
    include: {
      client: { select: { fullName: true } },
      lead: { select: { name: true } },
      deal: { select: { id: true, dealNumber: true } },
      payment: { select: { label: true } },
      uploadedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("documentsTitle")}</h1>
        <p className="a-page-sub">{t("documentsSubtitle")}</p>
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[920px]">
          <thead>
            <tr>
              <th>{t("docType")}</th>
              <th>{t("docTitle")}</th>
              <th>{t("linkedRecord")}</th>
              <th>{t("status")}</th>
              <th>{t("uploadedBy")}</th>
              <th>{t("reviewedBy")}</th>
              <th style={{ textAlign: "right" }}>{t("uploaded")}</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{documentTypeLabel(t, document.type)}</td>
                <td><a href={document.fileUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">{document.title}</a></td>
                <td>
                  {document.deal ? <Link className="hover:underline" href={`/portal/management-x7k9/crm/deals/${document.deal.id}`}>{document.deal.dealNumber}</Link> : document.client?.fullName || document.lead?.name || document.payment?.label || "—"}
                </td>
                <td>{documentStatusLabel(t, document.status)}</td>
                <td>{document.uploadedBy?.name || document.uploadedBy?.email || "—"}</td>
                <td>{document.reviewedBy?.name || document.reviewedBy?.email || "—"}</td>
                <td style={{ textAlign: "right" }}>{document.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {documents.length === 0 ? <tr><td colSpan={7} className="text-center py-10" style={{ color: "var(--a-text-tertiary)" }}>{t("noDocumentsYet")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
