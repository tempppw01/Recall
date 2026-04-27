-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('normal', 'low_stock', 'need_restock', 'missing');

-- Normalize existing item status values before converting the column type.
UPDATE "Item"
SET "status" = CASE
  WHEN "status" IN ('normal', 'low_stock', 'need_restock', 'missing') THEN "status"
  ELSE 'normal'
END;

-- AlterTable
ALTER TABLE "Item"
ALTER COLUMN "status" TYPE "ItemStatus"
USING "status"::"ItemStatus";

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_sortOrder_createdAt_idx" ON "Task"("userId", "sortOrder", "createdAt");

-- CreateIndex
CREATE INDEX "Countdown_userId_createdAt_idx" ON "Countdown"("userId", "createdAt");
