-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "link" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "question_messages" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_message_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "notification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_messages_questionId_createdAt_idx" ON "question_messages"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "question_messages_senderId_createdAt_idx" ON "question_messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "question_message_receipts_userId_messageId_idx" ON "question_message_receipts"("userId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "question_message_receipts_messageId_userId_key" ON "question_message_receipts"("messageId", "userId");

-- CreateIndex
CREATE INDEX "notification_tokens_userId_createdAt_idx" ON "notification_tokens"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_tokens_fcmToken_key" ON "notification_tokens"("fcmToken");

-- AddForeignKey
ALTER TABLE "question_messages" ADD CONSTRAINT "question_messages_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_messages" ADD CONSTRAINT "question_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_message_receipts" ADD CONSTRAINT "question_message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "question_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_message_receipts" ADD CONSTRAINT "question_message_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_tokens" ADD CONSTRAINT "notification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
