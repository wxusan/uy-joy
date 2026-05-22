-- CreateTable
CREATE TABLE "PlatformSettingsRecord" (
    "id" TEXT NOT NULL,
    "clientSlug" TEXT,
    "companyLegalName" TEXT,
    "publicBrandName" TEXT,
    "showPoweredByUyJoy" BOOLEAN,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "defaultLocale" TEXT,
    "enabledLocalesJson" JSONB,
    "publicPhoneNumber" TEXT,
    "publicTelegramUrl" TEXT,
    "publicInstagramUrl" TEXT,
    "salesOfficeAddress" TEXT,
    "salesHoursLabel" TEXT,
    "plan" TEXT,
    "featureFlags" JSONB,
    "userLimit" INTEGER,
    "projectLimit" INTEGER,
    "storageLabel" TEXT,
    "allowAgentClaim" BOOLEAN,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettingsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDigestPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDigestPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformSettingsRecord_updatedById_idx" ON "PlatformSettingsRecord"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDigestPreference_userId_key" ON "ReportDigestPreference"("userId");

-- CreateIndex
CREATE INDEX "ReportDigestPreference_enabled_idx" ON "ReportDigestPreference"("enabled");

-- AddForeignKey
ALTER TABLE "PlatformSettingsRecord" ADD CONSTRAINT "PlatformSettingsRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDigestPreference" ADD CONSTRAINT "ReportDigestPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
