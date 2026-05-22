-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "source" TEXT,
    "campaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "projectId" TEXT,
    "unitId" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "distinctId" TEXT,
    "sessionId" TEXT,
    "landingPath" TEXT,
    "referrer" TEXT,
    "locale" TEXT,
    "properties" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdSpend_source_idx" ON "AdSpend"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdSpend_campaign_idx" ON "AdSpend"("campaign");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdSpend_periodStart_periodEnd_idx" ON "AdSpend"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdSpend_createdById_idx" ON "AdSpend"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventName_occurredAt_idx" ON "AnalyticsEvent"("eventName", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_source_occurredAt_idx" ON "AnalyticsEvent"("source", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_campaign_occurredAt_idx" ON "AnalyticsEvent"("campaign", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_utmCampaign_occurredAt_idx" ON "AnalyticsEvent"("utmCampaign", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_projectId_occurredAt_idx" ON "AnalyticsEvent"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_unitId_occurredAt_idx" ON "AnalyticsEvent"("unitId", "occurredAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_leadId_idx" ON "AnalyticsEvent"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_clientId_idx" ON "AnalyticsEvent"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_occurredAt_idx" ON "AnalyticsEvent"("sessionId", "occurredAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_projectId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_unitId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_leadId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnalyticsEvent_clientId_fkey'
  ) THEN
    ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
