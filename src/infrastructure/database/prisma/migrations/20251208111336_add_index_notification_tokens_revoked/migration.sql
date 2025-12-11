-- CreateIndex
CREATE INDEX "notification_tokens_userId_revokedAt_idx" ON "notification_tokens"("userId", "revokedAt");
