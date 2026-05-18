-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "domain" TEXT,
    "name" TEXT NOT NULL,
    "nameTranslations" TEXT,
    "description" TEXT,
    "descriptionTranslations" TEXT,
    "address" TEXT,
    "addressTranslations" TEXT,
    "coverImage" TEXT,
    "topViewImage" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "infrastructure" JSONB,
    "expectedYear" INTEGER,
    "phoneNumber" TEXT,
    "telegramUrl" TEXT,
    "instagramUrl" TEXT,
    "salesOfficeAddress" TEXT,
    "salesHoursStart" TEXT,
    "salesHoursEnd" TEXT,
    "salesDaysJson" TEXT,
    "masterPlanImage" TEXT,
    "brandLogo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTranslations" TEXT,
    "projectId" TEXT NOT NULL,
    "frontViewImage" TEXT,
    "backViewImage" TEXT,
    "leftViewImage" TEXT,
    "rightViewImage" TEXT,
    "polygonData" JSONB,
    "labelX" DOUBLE PRECISION,
    "labelY" DOUBLE PRECISION,
    "pointX" DOUBLE PRECISION,
    "pointY" DOUBLE PRECISION,
    "labelScale" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "buildingId" TEXT NOT NULL,
    "basePricePerM2" DOUBLE PRECISION,
    "floorPlanImage" TEXT,
    "positionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "pricePerM2" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "polygonData" JSONB,
    "labelX" DOUBLE PRECISION,
    "labelY" DOUBLE PRECISION,
    "sketchImage" TEXT,
    "sketchImage2" TEXT,
    "sketchImage3" TEXT,
    "sketchImage4" TEXT,
    "description" TEXT,
    "descriptionTranslations" TEXT,
    "features" JSONB,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerNotes" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT,
    "unitId" TEXT,
    "unitNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "source" TEXT,
    "assignedTo" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "unitNumberSnapshot" TEXT,
    "unitAreaSnapshot" DOUBLE PRECISION,
    "unitRoomsSnapshot" INTEGER,
    "unitPriceSnapshot" DOUBLE PRECISION,
    "buildingNameSnapshot" TEXT,
    "floorNumberSnapshot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "questionUz" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionRu" TEXT NOT NULL,
    "answerUz" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerRu" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");

-- CreateIndex
CREATE INDEX "Building_projectId_idx" ON "Building"("projectId");

-- CreateIndex
CREATE INDEX "Floor_buildingId_idx" ON "Floor"("buildingId");

-- CreateIndex
CREATE INDEX "Unit_floorId_idx" ON "Unit"("floorId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE INDEX "Lead_projectId_idx" ON "Lead"("projectId");

-- CreateIndex
CREATE INDEX "Lead_unitId_idx" ON "Lead"("unitId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
