-- CreateTable
CREATE TABLE "question_categories" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_categories_questionId_idx" ON "question_categories"("questionId");

-- CreateIndex
CREATE INDEX "question_categories_categoryId_idx" ON "question_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "question_categories_questionId_categoryId_key" ON "question_categories"("questionId", "categoryId");

-- AddForeignKey
ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
