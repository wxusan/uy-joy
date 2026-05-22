-- Step 2 CRM core: users, clients, lead evolution, stages, activities, tasks.

ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "phone" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "Lead"
ADD COLUMN "clientId" TEXT,
ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "sourceDetail" TEXT,
ADD COLUMN "campaign" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "lastActivityAt" TIMESTAMP(3),
ADD COLUMN "lastContactedAt" TIMESTAMP(3),
ADD COLUMN "nextActionAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "convertedAt" TIMESTAMP(3),
ADD COLUMN "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "firstResponseAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "phoneNormalized" TEXT,
  "secondaryPhone" TEXT,
  "email" TEXT,
  "telegramUsername" TEXT,
  "instagramUsername" TEXT,
  "preferredLanguage" TEXT,
  "type" TEXT NOT NULL DEFAULT 'individual',
  "companyName" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdById" TEXT,
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineStage" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "color" TEXT,
  "probabilityPercent" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isWon" BOOLEAN NOT NULL DEFAULT false,
  "isLost" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadStageHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "changedById" TEXT,
  "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "clientId" TEXT,
  "leadId" TEXT,
  "unitId" TEXT,
  "dealId" TEXT,
  "taskId" TEXT,
  "actorId" TEXT,
  "assignedToId" TEXT,
  "direction" TEXT,
  "channel" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'call',
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "clientId" TEXT,
  "leadId" TEXT,
  "dealId" TEXT,
  "unitId" TEXT,
  "assignedToId" TEXT NOT NULL,
  "createdById" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesAgentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "phone" TEXT,
  "telegramUsername" TEXT,
  "avatarUrl" TEXT,
  "isVisibleInReports" BOOLEAN NOT NULL DEFAULT true,
  "monthlyTargetDeals" INTEGER,
  "monthlyTargetRevenue" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesAgentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PipelineStage_key_key" ON "PipelineStage"("key");
CREATE UNIQUE INDEX "SalesAgentProfile_userId_key" ON "SalesAgentProfile"("userId");

CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");
CREATE INDEX "Lead_nextActionAt_idx" ON "Lead"("nextActionAt");
CREATE INDEX "Lead_lastActivityAt_idx" ON "Lead"("lastActivityAt");

CREATE INDEX "Client_phoneNormalized_idx" ON "Client"("phoneNormalized");
CREATE INDEX "Client_assignedToId_idx" ON "Client"("assignedToId");
CREATE INDEX "Client_status_idx" ON "Client"("status");
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

CREATE INDEX "PipelineStage_sortOrder_idx" ON "PipelineStage"("sortOrder");
CREATE INDEX "PipelineStage_isActive_idx" ON "PipelineStage"("isActive");

CREATE INDEX "LeadStageHistory_leadId_idx" ON "LeadStageHistory"("leadId");
CREATE INDEX "LeadStageHistory_toStatus_idx" ON "LeadStageHistory"("toStatus");
CREATE INDEX "LeadStageHistory_enteredAt_idx" ON "LeadStageHistory"("enteredAt");
CREATE INDEX "LeadStageHistory_leftAt_idx" ON "LeadStageHistory"("leftAt");

CREATE INDEX "Activity_clientId_idx" ON "Activity"("clientId");
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");
CREATE INDEX "Activity_unitId_idx" ON "Activity"("unitId");
CREATE INDEX "Activity_taskId_idx" ON "Activity"("taskId");
CREATE INDEX "Activity_actorId_idx" ON "Activity"("actorId");
CREATE INDEX "Activity_type_idx" ON "Activity"("type");
CREATE INDEX "Activity_channel_idx" ON "Activity"("channel");
CREATE INDEX "Activity_occurredAt_idx" ON "Activity"("occurredAt");

CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");
CREATE INDEX "Task_unitId_idx" ON "Task"("unitId");
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Client"
ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadStageHistory"
ADD CONSTRAINT "LeadStageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LeadStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Task_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesAgentProfile"
ADD CONSTRAINT "SalesAgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Lead"
SET "status" = CASE "status"
  WHEN 'inCRM' THEN 'contacted'
  WHEN 'callback' THEN 'contacted'
  WHEN 'inProgress' THEN 'negotiation'
  WHEN 'converted' THEN 'sold'
  WHEN 'notInterested' THEN 'lost'
  WHEN 'closed' THEN 'lost'
  WHEN 'new' THEN 'new'
  WHEN 'contacted' THEN 'contacted'
  WHEN 'meeting' THEN 'meeting'
  WHEN 'negotiation' THEN 'negotiation'
  WHEN 'reserved' THEN 'reserved'
  WHEN 'sold' THEN 'sold'
  WHEN 'lost' THEN 'lost'
  ELSE 'new'
END;

INSERT INTO "Client" ("id", "fullName", "phone", "phoneNormalized", "source", "createdAt", "updatedAt")
SELECT
  'client_' || md5(COALESCE("phone", '')),
  max("name"),
  "phone",
  regexp_replace("phone", '[^0-9+]', '', 'g'),
  max("source"),
  min("createdAt"),
  max("createdAt")
FROM "Lead"
WHERE "phone" IS NOT NULL AND length(trim("phone")) > 0
GROUP BY "phone"
ON CONFLICT ("id") DO NOTHING;

UPDATE "Lead"
SET
  "clientId" = 'client_' || md5(COALESCE("phone", '')),
  "lastActivityAt" = COALESCE("lastActivityAt", "createdAt"),
  "stageEnteredAt" = COALESCE("stageEnteredAt", "createdAt"),
  "updatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "clientId" IS NULL AND "phone" IS NOT NULL AND length(trim("phone")) > 0;

INSERT INTO "LeadStageHistory" ("id", "leadId", "fromStatus", "toStatus", "enteredAt", "createdAt")
SELECT
  'history_' || md5("id" || ':' || "status"),
  "id",
  NULL,
  "status",
  "stageEnteredAt",
  "createdAt"
FROM "Lead"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Activity" ("id", "type", "title", "clientId", "leadId", "channel", "metadata", "occurredAt", "createdAt")
SELECT
  'activity_' || md5("id" || ':created'),
  'created',
  'Lead imported into CRM',
  "clientId",
  "id",
  'system',
  jsonb_build_object('source', "source", 'legacyImport', true),
  "createdAt",
  "createdAt"
FROM "Lead"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PipelineStage" ("id", "key", "name", "sortOrder", "color", "isDefault", "isWon", "isLost")
VALUES
  ('stage_new', 'new', 'New', 10, '#2563eb', true, false, false),
  ('stage_contacted', 'contacted', 'Contacted', 20, '#0891b2', true, false, false),
  ('stage_meeting', 'meeting', 'Meeting', 30, '#7c3aed', true, false, false),
  ('stage_negotiation', 'negotiation', 'Negotiation', 40, '#ca8a04', true, false, false),
  ('stage_reserved', 'reserved', 'Reserved', 50, '#ea580c', true, false, false),
  ('stage_sold', 'sold', 'Sold', 60, '#16a34a', true, true, false),
  ('stage_lost', 'lost', 'Lost', 70, '#64748b', true, false, true);
