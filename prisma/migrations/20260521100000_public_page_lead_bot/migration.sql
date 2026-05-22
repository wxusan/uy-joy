-- Step 4: public page configuration, lead sources, UTM capture, and Telegram outbox.

ALTER TABLE "Lead"
ADD COLUMN "referrer" TEXT,
ADD COLUMN "landingPath" TEXT,
ADD COLUMN "preferredLanguage" TEXT;

CREATE TABLE "PublicPageConfig" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "brandName" TEXT,
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#c66348',
  "secondaryColor" TEXT NOT NULL DEFAULT '#15120f',
  "accentColor" TEXT NOT NULL DEFAULT '#f0a383',
  "backgroundColor" TEXT NOT NULL DEFAULT '#f4efe7',
  "textColor" TEXT NOT NULL DEFAULT '#15120f',
  "fontMode" TEXT NOT NULL DEFAULT 'default',
  "heroTitleJson" JSONB,
  "heroSubtitleJson" JSONB,
  "heroImageUrl" TEXT,
  "heroVideoUrl" TEXT,
  "primaryCtaLabelJson" JSONB,
  "secondaryCtaLabelJson" JSONB,
  "formTitleJson" JSONB,
  "formSubtitleJson" JSONB,
  "thankYouTitleJson" JSONB,
  "thankYouMessageJson" JSONB,
  "enabledSections" JSONB,
  "designTokens" JSONB,
  "embedAllowedOrigins" JSONB,
  "redirectAfterSubmit" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PublicPageConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadSource" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelJson" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "defaultAssignedAgentId" TEXT,
  "defaultPipelineStageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramNotificationLog" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "clientId" TEXT,
  "chatId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "messageText" TEXT NOT NULL,
  "telegramMessageId" TEXT,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicPageConfig_projectId_key" ON "PublicPageConfig"("projectId");
CREATE INDEX "PublicPageConfig_projectId_idx" ON "PublicPageConfig"("projectId");
CREATE UNIQUE INDEX "LeadSource_key_key" ON "LeadSource"("key");
CREATE INDEX "LeadSource_isActive_idx" ON "LeadSource"("isActive");
CREATE INDEX "TelegramNotificationLog_leadId_idx" ON "TelegramNotificationLog"("leadId");
CREATE INDEX "TelegramNotificationLog_clientId_idx" ON "TelegramNotificationLog"("clientId");
CREATE INDEX "TelegramNotificationLog_status_nextAttemptAt_idx" ON "TelegramNotificationLog"("status", "nextAttemptAt");
CREATE INDEX "TelegramNotificationLog_createdAt_idx" ON "TelegramNotificationLog"("createdAt");

ALTER TABLE "PublicPageConfig"
ADD CONSTRAINT "PublicPageConfig_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramNotificationLog"
ADD CONSTRAINT "TelegramNotificationLog_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelegramNotificationLog"
ADD CONSTRAINT "TelegramNotificationLog_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "LeadSource" ("id", "key", "labelJson", "isSystem", "isActive", "createdAt", "updatedAt")
VALUES
  ('leadsource_public_page', 'public_page', '{"uz":"Ommaviy sahifa","ru":"Публичная страница","en":"Public page"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_contact_form', 'contact_form', '{"uz":"Aloqa formasi","ru":"Форма контакта","en":"Contact form"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_apartment_page', 'apartment_page', '{"uz":"Xonadon sahifasi","ru":"Страница квартиры","en":"Apartment page"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_visual_explorer', 'visual_explorer', '{"uz":"Vizual tanlov","ru":"Визуальный выбор","en":"Visual explorer"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_floating_contact', 'floating_contact', '{"uz":"Tez aloqa","ru":"Быстрый контакт","en":"Floating contact"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_waitlist', 'waitlist', '{"uz":"Kutish ro‘yxati","ru":"Лист ожидания","en":"Waitlist"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_telegram', 'telegram', '{"uz":"Telegram","ru":"Telegram","en":"Telegram"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_instagram', 'instagram', '{"uz":"Instagram","ru":"Instagram","en":"Instagram"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_campaign', 'campaign', '{"uz":"Kampaniya","ru":"Кампания","en":"Campaign"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('leadsource_manual', 'manual', '{"uz":"Qo‘lda","ru":"Вручную","en":"Manual"}'::jsonb, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
