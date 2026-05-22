import prisma from "./prisma";

function splitList(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getEnvDigestEmailRecipients() {
  return splitList(process.env.REPORT_DIGEST_EMAIL_TO);
}

export async function getWeeklyDigestRecipients() {
  const preferences = await prisma.reportDigestPreference.findMany({
    where: { enabled: true, user: { isActive: true } },
    include: {
      user: {
        select: { email: true, isActive: true },
      },
    },
  });

  const recipients = preferences
    .map((preference) => preference.email?.trim() || preference.user.email)
    .filter((email, index, all): email is string => Boolean(email) && all.indexOf(email) === index);

  return recipients.length > 0 ? recipients : getEnvDigestEmailRecipients();
}

export async function getReportDigestPreference(userId: string) {
  return prisma.reportDigestPreference.findUnique({ where: { userId } });
}

export async function upsertReportDigestPreference(userId: string, input: { enabled?: boolean; email?: string | null }) {
  return prisma.reportDigestPreference.upsert({
    where: { userId },
    create: {
      userId,
      enabled: input.enabled ?? true,
      email: input.email?.trim() || null,
    },
    update: {
      enabled: input.enabled,
      email: input.email === undefined ? undefined : input.email?.trim() || null,
    },
  });
}
