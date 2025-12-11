-- DropIndex
DROP INDEX "questions_embedding_idx";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
