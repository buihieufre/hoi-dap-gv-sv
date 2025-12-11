import { NextApiRequest } from "next";
import { Server as IOServer } from "socket.io";
import { setIO, getIO } from "@/shared/socket-io";
import { prisma } from "@/infrastructure/database/prisma";
import { getTokenFromCookies, verifyToken } from "@/infrastructure/config/auth";
import { sendFcmMessage } from "@/infrastructure/firebase/firebase-admin";

// Track emitted notifications to prevent duplicates
const emittedNotifications = new Set<string>();

function emitNotification(io: IOServer, userId: string, notif: any) {
  // Create unique key for this notification
  const notificationKey = `${userId}:${notif.id}`;

  // Skip if already emitted
  if (emittedNotifications.has(notificationKey)) {
    console.log(
      `[Socket] ⚠️ Notification ${notif.id} already emitted to user ${userId}, skipping`
    );
    return;
  }

  // Mark as emitted
  emittedNotifications.add(notificationKey);

  // Clean up old entries (keep only last 1000)
  if (emittedNotifications.size > 1000) {
    const entries = Array.from(emittedNotifications);
    entries.slice(0, 100).forEach((key) => emittedNotifications.delete(key));
  }

  // Format notification for client
  const payload = {
    id: notif.id,
    title: notif.title,
    content: notif.content,
    link: notif.link,
    createdAt:
      notif.createdAt instanceof Date
        ? notif.createdAt.toISOString()
        : notif.createdAt || new Date().toISOString(),
  };
  console.log(`[Socket] Emitting notification to user:${userId}`, payload);
  // Emit to user room only (single delivery)
  io.to(`user:${userId}`).emit("notification:new", payload);
  console.log(`[Socket] ✓ Notification emitted to room user:${userId}`);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  // Ensure res.socket exists (required for Socket.io)
  if (!res.socket) {
    console.error(
      "[Socket API] ✗ res.socket is undefined! Cannot initialize Socket.io."
    );
    res.status(500).json({ error: "Socket not available" });
    return;
  }

  console.log("[Socket API] Handler called:", {
    method: req.method,
    url: req.url,
    headers: {
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      cookie: !!req.headers.cookie,
    },
    socketServerExists: !!res.socket?.server,
    ioExists: !!res.socket?.server?.io,
  });

  // Get or create Socket.io server instance
  let io: IOServer;
  if (!res.socket.server.io) {
    console.log("[Socket API] Initializing Socket.io server...");
    try {
      io = new IOServer(res.socket.server, {
        path: "/api/socket",
        cors: {
          origin: "*",
        },
        transports: ["websocket", "polling"], // Allow both for compatibility
      });
      setIO(io);
      res.socket.server.io = io;
      console.log("[Socket API] ✓ Socket.io server initialized successfully");
    } catch (error: any) {
      console.error("[Socket API] ✗ Failed to initialize Socket.io:", error);
      res.status(500).json({ error: "Failed to initialize Socket.io" });
      return;
    }
  } else {
    io = res.socket.server.io;
    console.log(
      "[Socket API] Socket.io server already initialized, reusing..."
    );
  }

  // Setup connection handler (only once)
  // Use a flag to track if handler is already set up
  if (!(res.socket.server as any)._socketIOHandlerSetup) {
    (res.socket.server as any)._socketIOHandlerSetup = true;
    io.on("connection", (socket: any) => {
      console.log("[Socket] New connection attempt, socket ID:", socket.id);
      console.log(
        "[Socket] Cookies present:",
        !!socket.handshake.headers.cookie
      );

      // Auth via cookie token
      try {
        const cookie = socket.handshake.headers.cookie || "";
        const token = getTokenFromCookies(cookie);
        if (!token) {
          console.error("[Socket] No token found in cookies");
          throw new Error("NO_TOKEN");
        }
        const payload = verifyToken(token);
        if (!payload?.userId || !payload.role) {
          console.error("[Socket] Invalid token payload:", payload);
          throw new Error("INVALID_TOKEN");
        }
        socket.data.user = {
          userId: payload.userId as string,
          fullName: (payload as any).fullName,
          role: payload.role as string,
          email: (payload as any).email,
        };
        socket.join(`user:${payload.userId}`);
        console.log(
          `[Socket] ✓ User ${payload.userId} authenticated and joined room`
        );
      } catch (err: any) {
        console.error("[Socket] ✗ Authentication failed:", err.message);
        // Emit auth_error before disconnecting so client can handle it
        socket.emit("auth_error", {
          message: "Authentication failed",
          details: err.message || "Unknown error",
        });
        setTimeout(() => {
          socket.disconnect(true);
        }, 100);
        return;
      }

      socket.on("join-user", (userId: string) => {
        if (userId) socket.join(`user:${userId}`);
      });
      socket.on("join-question", (qid: string) => {
        if (qid) socket.join(`question:${qid}`);
      });
      socket.on("leave-question", (qid: string) => {
        if (qid) socket.leave(`question:${qid}`);
      });

      // Handle answer creation via socket (emit first, persist later)
      socket.on(
        "answer:send",
        async (
          payload: { questionId?: string; content?: any; tempId?: string },
          cb?: (resp: { ok?: boolean; error?: string }) => void
        ) => {
          try {
            const user = socket.data.user;
            if (!user?.userId) throw new Error("UNAUTHENTICATED");
            const questionId = payload?.questionId;
            const content = payload?.content;
            if (!questionId) throw new Error("Thiếu questionId");
            if (!content || (content.blocks && content.blocks.length === 0)) {
              throw new Error("Nội dung trả lời không được để trống");
            }

            // Fetch question
            const question = await prisma.question.findUnique({
              where: { id: questionId },
              select: {
                id: true,
                title: true,
                authorId: true,
                approvalStatus: true,
              },
            });
            if (!question) throw new Error("Không tìm thấy câu hỏi");
            if (question.approvalStatus !== "APPROVED") {
              throw new Error("Câu hỏi chưa được duyệt nên không thể trả lời");
            }

            const contentToSave =
              typeof content === "string" ? content : JSON.stringify(content);

            // Optimistic emit before DB
            const tempId = payload?.tempId || `temp-${Date.now()}`;
            const optimisticAnswer = {
              id: tempId,
              content: contentToSave,
              isPinned: false,
              author: {
                id: user.userId,
                fullName: user.fullName,
                role: user.role,
              },
              createdAt: new Date().toISOString(),
              questionId,
              votesCount: 0,
            };
            io.to(`question:${questionId}`).emit(
              "answer:new",
              optimisticAnswer
            );
            if (question.authorId) {
              io.to(`user:${question.authorId}`).emit(
                "answer:new",
                optimisticAnswer
              );
            }
            cb?.({ ok: true });

            // Persist and replace once done
            try {
              const answer = await prisma.answer.create({
                data: {
                  content: contentToSave,
                  questionId,
                  authorId: user.userId,
                },
                include: {
                  author: {
                    select: { id: true, fullName: true, role: true },
                  },
                },
              });

              const persistedPayload = {
                id: answer.id,
                content: answer.content,
                isPinned: answer.isPinned,
                author: answer.author,
                createdAt: answer.createdAt,
                questionId,
                votesCount: 0,
              };

              io.to(`question:${questionId}`).emit("answer:replace", {
                tempId,
                answer: persistedPayload,
              });
              if (question.authorId) {
                io.to(`user:${question.authorId}`).emit("answer:replace", {
                  tempId,
                  answer: persistedPayload,
                });
              }

              // Notification + FCM + socket push to watchers only
              // Recipients: question author + users who are watching this question (excluding sender)
              const recipients = new Set<string>();

              // Add question author (if different from sender)
              if (question.authorId && question.authorId !== user.userId) {
                recipients.add(question.authorId);
              }

              // Get all watchers (users who clicked "Quan tâm")
              const watchers = await prisma.questionWatcher.findMany({
                where: {
                  questionId,
                  userId: { not: user.userId }, // Exclude sender
                },
                select: { userId: true },
              });

              console.log(
                `[Socket] Found ${watchers.length} watchers for question ${questionId}`
              );

              watchers.forEach((w) => {
                if (w.userId && w.userId !== question.authorId) {
                  recipients.add(w.userId);
                }
              });

              // Send notifications to all recipients
              const link = `/questions/${questionId}#answer-${answer.id}`;
              console.log(
                `[Socket] Sending notifications to ${recipients.size} recipients for answer ${answer.id}`,
                Array.from(recipients)
              );

              if (recipients.size === 0) {
                console.warn(
                  `[Socket] No recipients found for question ${questionId}`
                );
              }

              await Promise.allSettled(
                Array.from(recipients).map(async (recipientId) => {
                  try {
                    // Check if notification already exists to prevent duplicates
                    const existingNotif = await prisma.notification.findFirst({
                      where: {
                        userId: recipientId,
                        type: "ANSWER_CREATED",
                        questionId,
                        answerId: answer.id,
                      },
                    });

                    let notif;
                    if (existingNotif) {
                      console.log(
                        `[Socket] ⚠️ Notification already exists for user ${recipientId}, answer ${answer.id}, skipping creation`
                      );
                      notif = existingNotif;
                    } else {
                      // Always create notification in DB (even without FCM token)
                      notif = await prisma.notification.create({
                        data: {
                          userId: recipientId,
                          type: "ANSWER_CREATED",
                          title: "Có câu trả lời mới",
                          content: `Câu hỏi "${question.title}" vừa có câu trả lời mới.`,
                          link,
                          meta: {
                            questionId,
                            answerId: answer.id,
                          },
                          questionId,
                          answerId: answer.id,
                        },
                      });
                      console.log(
                        `[Socket] ✓ Created notification ${notif.id} for user ${recipientId}`
                      );
                    }

                    // Emit socket notification (real-time) - only if not already emitted
                    emitNotification(io, recipientId, notif);

                    // Send FCM push notification (if tokens exist)
                    try {
                      const tokens = await prisma.notificationToken.findMany({
                        where: { userId: recipientId, revokedAt: null },
                        select: { fcmToken: true },
                      });
                      console.log(
                        `[Socket] Found ${tokens.length} FCM tokens for user ${recipientId}`
                      );
                      if (tokens.length > 0) {
                        await Promise.allSettled(
                          tokens.map((t) =>
                            sendFcmMessage({
                              token: t.fcmToken,
                              notification: {
                                title: "Có câu trả lời mới",
                                body: question.title,
                              },
                              data: { link, questionId, answerId: answer.id },
                              link,
                            }).catch((err) =>
                              console.error(
                                `[Socket] ✗ FCM send failed for token ${t.fcmToken.substring(
                                  0,
                                  20
                                )}...:`,
                                err
                              )
                            )
                          )
                        );
                      }
                    } catch (fcmErr) {
                      console.error(
                        `[Socket] ✗ FCM token lookup failed for user ${recipientId}:`,
                        fcmErr
                      );
                      // Don't fail notification creation if FCM fails
                    }
                  } catch (err: any) {
                    console.error(
                      `[Socket] ✗ Failed to create/send notification to ${recipientId}:`,
                      err?.message || err
                    );
                    // Log full error in development
                    if (process.env.NODE_ENV === "development") {
                      console.error(err);
                    }
                  }
                })
              );
            } catch (err) {
              // If persist fails, notify clients to remove temp
              io.to(`question:${questionId}`).emit("answer:remove-temp", {
                tempId,
              });
              if (question.authorId) {
                io.to(`user:${question.authorId}`).emit("answer:remove-temp", {
                  tempId,
                });
              }
            }
          } catch (err: any) {
            cb?.({ ok: false, error: err?.message || "Lỗi gửi trả lời" });
          }
        }
      );

      // Handle answer update via socket (with persistence)
      socket.on(
        "answer:update",
        async (
          payload: {
            questionId?: string;
            answerId?: string;
            content?: any;
            editCount?: number;
            editedAt?: string;
            originalContent?: string;
          },
          cb?: (resp: { ok?: boolean; error?: string }) => void
        ) => {
          try {
            const user = socket.data.user;
            if (!user?.userId) {
              cb?.({ ok: false, error: "UNAUTHENTICATED" });
              return;
            }
            const questionId = payload?.questionId;
            const answerId = payload?.answerId;
            const content = payload?.content;
            if (!questionId || !answerId) {
              cb?.({ ok: false, error: "Thiếu questionId hoặc answerId" });
              return;
            }
            if (!content) {
              cb?.({ ok: false, error: "Nội dung không được để trống" });
              return;
            }

            // Get answer to check ownership and edit count
            const answer = await prisma.answer.findUnique({
              where: { id: answerId },
              include: {
                author: {
                  select: { id: true, fullName: true, role: true },
                },
                question: {
                  select: { id: true, approvalStatus: true },
                },
              },
            });

            if (!answer) {
              cb?.({ ok: false, error: "Không tìm thấy câu trả lời" });
              return;
            }

            // Check ownership
            if (answer.authorId !== user.userId) {
              cb?.({
                ok: false,
                error: "Bạn chỉ có thể chỉnh sửa câu trả lời của mình",
              });
              return;
            }

            // Check if already edited (max 1 edit)
            const editCount = (answer as any).editCount || 0;
            if (editCount >= 1) {
              cb?.({
                ok: false,
                error: "Câu trả lời chỉ có thể chỉnh sửa một lần",
              });
              return;
            }

            // Check question status
            if (answer.question.approvalStatus !== "APPROVED") {
              cb?.({
                ok: false,
                error:
                  "Không thể chỉnh sửa câu trả lời cho câu hỏi chưa được duyệt",
              });
              return;
            }

            // Format content
            let contentToSave: string;
            if (typeof content === "string") {
              if (!content.trim()) {
                cb?.({ ok: false, error: "Nội dung không được để trống" });
                return;
              }
              contentToSave = content.trim();
            } else if (content && typeof content === "object") {
              if (
                Array.isArray((content as any).blocks) &&
                (content as any).blocks.length === 0
              ) {
                cb?.({ ok: false, error: "Nội dung không được để trống" });
                return;
              }
              contentToSave = JSON.stringify(content);
            } else {
              cb?.({ ok: false, error: "Định dạng nội dung không hợp lệ" });
              return;
            }

            // Emit optimistic update immediately to all clients
            const optimisticPayload = {
              id: answerId,
              content: contentToSave,
              author: answer.author,
              editCount: payload.editCount ?? 1,
              editedAt: payload.editedAt || new Date().toISOString(),
              originalContent: payload.originalContent || answer.content,
              questionId,
            };
            io.to(`question:${questionId}`).emit(
              "answer:updated",
              optimisticPayload
            );
            cb?.({ ok: true }); // Acknowledge immediately

            // Persist to database in background
            try {
              const updateData: any = {
                content: contentToSave,
                editCount: 1,
                editedAt: new Date(),
              };

              // Save originalContent if not already saved
              if (editCount === 0 || !(answer as any).originalContent) {
                updateData.originalContent = answer.content;
                console.log(
                  `[Socket] Saving originalContent for answer ${answerId}:`,
                  answer.content.substring(0, 50)
                );
              } else {
                updateData.originalContent = (answer as any).originalContent;
                console.log(
                  `[Socket] Keeping existing originalContent for answer ${answerId}`
                );
              }

              console.log(`[Socket] Updating answer ${answerId} with data:`, {
                editCount: updateData.editCount,
                hasOriginalContent: !!updateData.originalContent,
                originalContentLength: updateData.originalContent?.length || 0,
                editedAt: updateData.editedAt,
              });

              const updatedAnswer = await prisma.answer.update({
                where: { id: answerId },
                data: updateData,
                include: {
                  author: {
                    select: { id: true, fullName: true, role: true },
                  },
                },
              });

              console.log(
                `[Socket] ✓ Answer ${answerId} updated successfully in database`
              );
              console.log(`[Socket] Retrieved data:`, {
                editCount: (updatedAnswer as any).editCount,
                hasOriginalContent: !!(updatedAnswer as any).originalContent,
                originalContentLength:
                  (updatedAnswer as any).originalContent?.length || 0,
                editedAt: (updatedAnswer as any).editedAt,
              });

              // Emit persisted update to replace optimistic one
              const answerData = updatedAnswer as any;
              const persistedPayload = {
                id: updatedAnswer.id,
                content: updatedAnswer.content,
                author: updatedAnswer.author,
                editCount: answerData.editCount ?? 1,
                editedAt:
                  answerData.editedAt?.toISOString() ||
                  new Date().toISOString(),
                originalContent: answerData.originalContent ?? null,
                questionId,
              };
              console.log(
                `[Socket] Emitting answer:updated with persisted data to question:${questionId}`
              );
              io.to(`question:${questionId}`).emit(
                "answer:updated",
                persistedPayload
              );
            } catch (dbError: any) {
              console.error(
                "[Socket] ✗ Error persisting answer update:",
                dbError
              );
              console.error("[Socket] Error code:", dbError.code);
              console.error("[Socket] Error message:", dbError.message);
              console.error("[Socket] Error meta:", dbError.meta);
              // Emit error to remove optimistic update
              io.to(`question:${questionId}`).emit("answer:update-failed", {
                id: answerId,
                questionId,
                error: dbError.message || "Lỗi cập nhật câu trả lời",
              });
            }
          } catch (err: any) {
            console.error("[Socket] Error handling answer:update:", err);
            cb?.({
              ok: false,
              error: err?.message || "Lỗi cập nhật câu trả lời",
            });
          }
        }
      );

      // Handle chat message via socket
      socket.on(
        "message:send",
        async (
          payload: { questionId?: string; content?: any },
          cb?: (resp: { ok?: boolean; error?: string; message?: any }) => void
        ) => {
          try {
            const user = socket.data.user;
            if (!user?.userId) throw new Error("UNAUTHENTICATED");
            const questionId = payload?.questionId;
            const content = payload?.content;
            if (!questionId) throw new Error("Thiếu questionId");
            if (!content || (content.blocks && content.blocks.length === 0)) {
              throw new Error("Nội dung tin nhắn không được để trống");
            }

            const question = await prisma.question.findUnique({
              where: { id: questionId },
              select: {
                id: true,
                title: true,
                authorId: true,
              },
            });
            if (!question) throw new Error("Không tìm thấy câu hỏi");

            const participants = await prisma.questionMessage.findMany({
              where: { questionId },
              select: { senderId: true },
              distinct: ["senderId"],
            });

            const contentToSave =
              typeof content === "string" ? content : JSON.stringify(content);

            const message = await prisma.questionMessage.create({
              data: {
                questionId,
                senderId: user.userId,
                content: contentToSave,
              },
              include: {
                sender: { select: { id: true, fullName: true, role: true } },
              },
            });

            // Recipients: question author + watchers only (excluding sender)
            const recipients = new Set<string>();

            // Add question author (if different from sender)
            if (question.authorId && question.authorId !== user.userId) {
              recipients.add(question.authorId);
            }

            // Get all watchers (users who clicked "Quan tâm")
            const watchers = await prisma.questionWatcher.findMany({
              where: {
                questionId,
                userId: { not: user.userId }, // Exclude sender
              },
              select: { userId: true },
            });

            console.log(
              `[Socket] Found ${watchers.length} watchers for question ${questionId} (message)`
            );

            watchers.forEach((w) => {
              if (w.userId && w.userId !== question.authorId) {
                recipients.add(w.userId);
              }
            });

            const payloadMsg = {
              id: message.id,
              content: message.content,
              sender: message.sender,
              createdAt: message.createdAt,
              questionId,
            };

            io.to(`question:${questionId}`).emit("message:new", payloadMsg);
            recipients.forEach((uid) => {
              io.to(`user:${uid}`).emit("message:new", payloadMsg);
            });

            cb?.({ ok: true, message: payloadMsg });

            // Fire-and-forget notification + FCM
            const link = `/questions/${questionId}#message-${message.id}`;
            await Promise.allSettled(
              Array.from(recipients).map(async (uid) => {
                try {
                  // Check if notification already exists to prevent duplicates
                  const existingNotif = await prisma.notification.findFirst({
                    where: {
                      userId: uid,
                      type: "MESSAGE_CREATED",
                      questionId,
                      answerId: message.id, // Using answerId field for messageId
                    },
                  });

                  let notif;
                  if (existingNotif) {
                    console.log(
                      `[Socket] ⚠️ Notification already exists for user ${uid}, message ${message.id}, skipping creation`
                    );
                    notif = existingNotif;
                  } else {
                    notif = await prisma.notification.create({
                      data: {
                        userId: uid,
                        type: "MESSAGE_CREATED",
                        title: "Tin nhắn mới",
                        content: `Câu hỏi "${question.title}" có tin nhắn mới`,
                        link,
                        meta: { questionId, messageId: message.id },
                        questionId,
                        answerId: message.id, // Store messageId in answerId field
                      },
                    });
                    console.log(
                      `[Socket] ✓ Created notification ${notif.id} for user ${uid}`
                    );
                  }

                  // Emit socket notification (real-time)
                  emitNotification(io, uid, notif);

                  // Send FCM push notification
                  const tokens = await prisma.notificationToken.findMany({
                    where: { userId: uid, revokedAt: null },
                    select: { fcmToken: true },
                  });
                  await Promise.allSettled(
                    tokens.map((t) =>
                      sendFcmMessage({
                        token: t.fcmToken,
                        notification: {
                          title: "Tin nhắn mới",
                          body: question.title,
                        },
                        data: { link, questionId, messageId: message.id },
                        link,
                      }).catch((err) => console.error("FCM send failed", err))
                    )
                  );
                } catch (err: any) {
                  console.error(
                    `[Socket] ✗ Failed to create/send notification to ${uid}:`,
                    err?.message || err
                  );
                }
              })
            );
          } catch (err: any) {
            cb?.({ ok: false, error: err?.message || "Lỗi gửi tin nhắn" });
          }
        }
      );
    });
  } else {
    console.log(
      "[Socket API] Socket.io server already initialized, reusing..."
    );
  }

  // Important: For Socket.io, we need to upgrade the connection
  // Don't end the response - Socket.io will handle it
  // Only end if it's not a WebSocket upgrade request
  if (!res.headersSent && !req.headers.upgrade) {
    res.end();
  }
}
