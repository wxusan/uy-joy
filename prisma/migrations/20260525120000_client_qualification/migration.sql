CREATE TABLE IF NOT EXISTS "ClientQualification" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "cityRegion" TEXT,
  "familySize" INTEGER,
  "roomCounts" JSONB,
  "preferredBuilding" TEXT,
  "preferredFloorMin" INTEGER,
  "preferredFloorMax" INTEGER,
  "preferredView" TEXT,
  "preferredAreaMin" DOUBLE PRECISION,
  "preferredAreaMax" DOUBLE PRECISION,
  "budgetMin" DOUBLE PRECISION,
  "budgetMax" DOUBLE PRECISION,
  "paymentPreference" TEXT,
  "initialPaymentAmount" DOUBLE PRECISION,
  "monthlyPaymentComfort" DOUBLE PRECISION,
  "installmentMonths" INTEGER,
  "mortgageInterest" BOOLEAN,
  "subsidyInterest" BOOLEAN,
  "buyingPurpose" TEXT,
  "temperature" TEXT,
  "urgency" TEXT,
  "seriousnessLevel" TEXT,
  "decisionMaker" TEXT,
  "objection" TEXT,
  "competitorProjects" TEXT,
  "bestCallTime" TEXT,
  "preferredChannel" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientQualification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientQualification_clientId_key" ON "ClientQualification"("clientId");
CREATE INDEX IF NOT EXISTS "ClientQualification_temperature_idx" ON "ClientQualification"("temperature");
CREATE INDEX IF NOT EXISTS "ClientQualification_paymentPreference_idx" ON "ClientQualification"("paymentPreference");
CREATE INDEX IF NOT EXISTS "ClientQualification_budgetMax_idx" ON "ClientQualification"("budgetMax");
CREATE INDEX IF NOT EXISTS "ClientQualification_updatedById_idx" ON "ClientQualification"("updatedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientQualification_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientQualification"
      ADD CONSTRAINT "ClientQualification_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientQualification_updatedById_fkey'
  ) THEN
    ALTER TABLE "ClientQualification"
      ADD CONSTRAINT "ClientQualification_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ClientInterestedUnit" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "leadId" TEXT,
  "interestLevel" TEXT NOT NULL DEFAULT 'interested',
  "note" TEXT,
  "addedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientInterestedUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientInterestedUnit_clientId_unitId_key" ON "ClientInterestedUnit"("clientId", "unitId");
CREATE INDEX IF NOT EXISTS "ClientInterestedUnit_clientId_idx" ON "ClientInterestedUnit"("clientId");
CREATE INDEX IF NOT EXISTS "ClientInterestedUnit_unitId_idx" ON "ClientInterestedUnit"("unitId");
CREATE INDEX IF NOT EXISTS "ClientInterestedUnit_leadId_idx" ON "ClientInterestedUnit"("leadId");
CREATE INDEX IF NOT EXISTS "ClientInterestedUnit_addedById_idx" ON "ClientInterestedUnit"("addedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientInterestedUnit_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientInterestedUnit"
      ADD CONSTRAINT "ClientInterestedUnit_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientInterestedUnit_unitId_fkey'
  ) THEN
    ALTER TABLE "ClientInterestedUnit"
      ADD CONSTRAINT "ClientInterestedUnit_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientInterestedUnit_leadId_fkey'
  ) THEN
    ALTER TABLE "ClientInterestedUnit"
      ADD CONSTRAINT "ClientInterestedUnit_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientInterestedUnit_addedById_fkey'
  ) THEN
    ALTER TABLE "ClientInterestedUnit"
      ADD CONSTRAINT "ClientInterestedUnit_addedById_fkey"
      FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
