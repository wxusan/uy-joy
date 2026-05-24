-- AlterTable
ALTER TABLE "TelegramNotificationLog" ADD COLUMN "ref" TEXT;

-- CreateIndex
CREATE INDEX "TelegramNotificationLog_ref_idx" ON "TelegramNotificationLog"("ref");
