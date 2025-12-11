-- CreateTable
CREATE TABLE "question_watchers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_watchers_questionId_idx" ON "question_watchers"("questionId");

-- CreateIndex
CREATE INDEX "question_watchers_userId_idx" ON "question_watchers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "question_watchers_questionId_userId_key" ON "question_watchers"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "question_watchers" ADD CONSTRAINT "question_watchers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_watchers" ADD CONSTRAINT "question_watchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
