-- CreateTable
CREATE TABLE "question_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_views_userId_idx" ON "question_views"("userId");

-- CreateIndex
CREATE INDEX "question_views_questionId_idx" ON "question_views"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_views_userId_questionId_key" ON "question_views"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
