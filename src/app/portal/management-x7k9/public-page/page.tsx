import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PLATFORM_PERMISSIONS } from "@/lib/platform-plans";
import { ensurePublicPageConfig, getDefaultProject, publicPageColorWarnings } from "@/lib/public-page";
import { getTranslations } from "next-intl/server";
import PublicPageSettingsClient from "./PublicPageSettingsClient";

export const dynamic = "force-dynamic";

export default async function PublicPageSettingsPage() {
  await requireAdmin(PLATFORM_PERMISSIONS.managePublicContent);
  const t = await getTranslations("admin");
  const project = await getDefaultProject();
  if (!project) {
    return (
      <div>
        <h1 className="a-page-title">{t("publicPageNav")}</h1>
        <p className="a-page-sub">{t("publicPageNoProject")}</p>
      </div>
    );
  }
  const config = await ensurePublicPageConfig(project);
  const failedTelegram = await prisma.telegramNotificationLog.findMany({
    where: { status: "failed" },
    include: { lead: { select: { id: true, name: true, phone: true, source: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="a-page-title">{t("publicPageNav")}</h1>
        <p className="a-page-sub">{t("publicPageSubtitle")}</p>
      </div>
      <PublicPageSettingsClient
        initialConfig={JSON.parse(JSON.stringify(config))}
        warnings={publicPageColorWarnings({
          primaryColor: config.primaryColor,
          backgroundColor: config.backgroundColor,
          textColor: config.textColor,
        })}
        telegramConfigured={Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)}
        failedTelegram={JSON.parse(JSON.stringify(failedTelegram))}
      />
    </div>
  );
}
