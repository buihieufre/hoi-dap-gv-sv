-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SYSTEM', 'ACADEMIC');

-- CreateEnum
CREATE TYPE "CategoryApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "approvalStatus" "CategoryApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'SYSTEM';

-- CreateIndex
CREATE INDEX "categories_type_idx" ON "categories"("type");

-- CreateIndex
CREATE INDEX "categories_approvalStatus_idx" ON "categories"("approvalStatus");

-- CreateIndex
CREATE INDEX "categories_authorId_idx" ON "categories"("authorId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
