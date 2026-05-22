-- Step 3 real-estate layer: deals, payment plans, payments, refunds, documents, and unit linkage.

ALTER TABLE "Unit"
ADD COLUMN "currentDealId" TEXT,
ADD COLUMN "reservedByClientId" TEXT,
ADD COLUMN "soldToClientId" TEXT,
ADD COLUMN "reservedAt" TIMESTAMP(3),
ADD COLUMN "soldAt" TIMESTAMP(3),
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "dealNumber" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "leadId" TEXT,
  "projectId" TEXT,
  "primaryUnitId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "source" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
  "paymentCurrency" TEXT NOT NULL DEFAULT 'UZS',
  "exchangeRateToPaymentCurrency" DOUBLE PRECISION,
  "exchangeRateLockedAt" TIMESTAMP(3),
  "listPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountFlaggedAt" TIMESTAMP(3),
  "discountApprovedById" TEXT,
  "discountApprovedAt" TIMESTAMP(3),
  "initialPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "initialPaymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentTermMonths" INTEGER NOT NULL DEFAULT 0,
  "monthlyPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expectedCloseAt" TIMESTAMP(3),
  "reservedAt" TIMESTAMP(3),
  "reservationExpiresAt" TIMESTAMP(3),
  "contractedAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3),
  "lostAt" TIMESTAMP(3),
  "lostReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealUnit" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "priceAtDeal" DOUBLE PRECISION NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentPlan" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'installment',
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "initialPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "termMonths" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "scheduleJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "paymentPlanId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "expectedAmount" DOUBLE PRECISION NOT NULL,
  "expectedAmountPaymentCurrency" DOUBLE PRECISION,
  "exchangeRate" DOUBLE PRECISION,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmountPaymentCurrency" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "paidAt" TIMESTAMP(3),
  "method" TEXT,
  "receiptDocumentId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "paymentId" TEXT,
  "clientId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "requestedById" TEXT,
  "approvedById" TEXT,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "leadId" TEXT,
  "dealId" TEXT,
  "unitId" TEXT,
  "paymentId" TEXT,
  "uploadedById" TEXT,
  "reviewedById" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "rejectionReason" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Deal_dealNumber_key" ON "Deal"("dealNumber");
CREATE UNIQUE INDEX "DealUnit_dealId_unitId_key" ON "DealUnit"("dealId", "unitId");
CREATE UNIQUE INDEX "Payment_paymentPlanId_sequence_key" ON "Payment"("paymentPlanId", "sequence");

CREATE INDEX "Unit_currentDealId_idx" ON "Unit"("currentDealId");
CREATE INDEX "Unit_reservedByClientId_idx" ON "Unit"("reservedByClientId");
CREATE INDEX "Unit_soldToClientId_idx" ON "Unit"("soldToClientId");
CREATE INDEX "Unit_reservationExpiresAt_idx" ON "Unit"("reservationExpiresAt");

CREATE INDEX "Deal_clientId_idx" ON "Deal"("clientId");
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");
CREATE INDEX "Deal_projectId_idx" ON "Deal"("projectId");
CREATE INDEX "Deal_primaryUnitId_idx" ON "Deal"("primaryUnitId");
CREATE INDEX "Deal_assignedToId_idx" ON "Deal"("assignedToId");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE INDEX "Deal_reservationExpiresAt_idx" ON "Deal"("reservationExpiresAt");
CREATE INDEX "Deal_createdAt_idx" ON "Deal"("createdAt");

CREATE INDEX "DealUnit_dealId_idx" ON "DealUnit"("dealId");
CREATE INDEX "DealUnit_unitId_idx" ON "DealUnit"("unitId");

CREATE INDEX "PaymentPlan_dealId_idx" ON "PaymentPlan"("dealId");
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");
CREATE INDEX "PaymentPlan_createdById_idx" ON "PaymentPlan"("createdById");

CREATE INDEX "Payment_paymentPlanId_idx" ON "Payment"("paymentPlanId");
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");
CREATE INDEX "Payment_receiptDocumentId_idx" ON "Payment"("receiptDocumentId");

CREATE INDEX "Refund_dealId_idx" ON "Refund"("dealId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX "Refund_clientId_idx" ON "Refund"("clientId");
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");
CREATE INDEX "Document_leadId_idx" ON "Document"("leadId");
CREATE INDEX "Document_dealId_idx" ON "Document"("dealId");
CREATE INDEX "Document_unitId_idx" ON "Document"("unitId");
CREATE INDEX "Document_paymentId_idx" ON "Document"("paymentId");
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX "Document_reviewedById_idx" ON "Document"("reviewedById");
CREATE INDEX "Document_type_idx" ON "Document"("type");
CREATE INDEX "Document_status_idx" ON "Document"("status");

ALTER TABLE "Unit"
ADD CONSTRAINT "Unit_currentDealId_fkey" FOREIGN KEY ("currentDealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Unit_reservedByClientId_fkey" FOREIGN KEY ("reservedByClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Unit_soldToClientId_fkey" FOREIGN KEY ("soldToClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_primaryUnitId_fkey" FOREIGN KEY ("primaryUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Deal_discountApprovedById_fkey" FOREIGN KEY ("discountApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DealUnit"
ADD CONSTRAINT "DealUnit_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DealUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentPlan"
ADD CONSTRAINT "PaymentPlan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PaymentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Refund_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Refund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Document_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Activity_dealId_idx" ON "Activity"("dealId");
CREATE INDEX "Task_dealId_idx" ON "Task"("dealId");
