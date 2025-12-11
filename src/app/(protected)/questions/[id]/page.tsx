"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Socket } from "socket.io-client";
import { getSocket } from "@/shared/socket-client";
import { useAuth } from "@/presentation/hooks/use-auth";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";
import {
  useQuestionsStore,
  QuestionDetail,
  Answer,
} from "@/presentation/stores/questions.store";
import { useViewTrackingStore } from "@/presentation/stores/view-tracking.store";
import { EditorJsRenderer } from "@/presentation/components/editor/editor-js-renderer";
import { SimilarQuestions } from "@/presentation/components/questions/similar-questions";
import { OutputData } from "@editorjs/editorjs";
import { Button } from "@/presentation/components/ui/button";
import { Loader2 } from "lucide-react";

// Dynamic import EditorJs to mirror the question creation editor (avoid SSR issues)
const EditorJs = dynamic(
  () =>
    import("@/presentation/components/editor/editor-js").then((mod) => ({
      default: mod.EditorJs,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <SystemPulseLogo className="w-4 h-4 mx-auto" />
        <div className="bg-white p-4 min-h-[200px]">
          <div className="text-gray-400 text-sm">Đang tải editor...</div>
        </div>
      </div>
    ),
  }
);

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const questionId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray((params as any)?.id)
      ? (params as any).id[0]
      : undefined;
  const [answerData, setAnswerData] = useState<OutputData | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerData, setEditAnswerData] = useState<OutputData | null>(null);
  const [editEditorKey, setEditEditorKey] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null);
  const [openMenuAnswerId, setOpenMenuAnswerId] = useState<string | null>(null);
  const [viewingOriginalAnswerId, setViewingOriginalAnswerId] = useState<
    string | null
  >(null);
  const [votingAnswerId, setVotingAnswerId] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isWatching, setIsWatching] = useState(false);
  const [isTogglingWatch, setIsTogglingWatch] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const {
    questionDetail: question,
    isLoadingDetail: isLoading,
    error,
    fetchQuestionDetail,
    updateQuestion,
    addAnswerToQuestion,
    replaceAnswer,
    removeAnswer,
    updateAnswer,
    voteAnswer,
  } = useQuestionsStore();

  const { incrementView } = useViewTrackingStore();

  // Sort answers: top vote first, then oldest for tie
  const sortedAnswers: Answer[] = useMemo(() => {
    return question?.answers ? [...question.answers] : [];
  }, [question?.answers]);

  const topVotedAnswer: Answer | null = useMemo(() => {
    if (!question?.answers || question.answers.length === 0) return null;
    const maxVotes = Math.max(
      0,
      ...question.answers.map((a) => a.votesCount || 0)
    );
    if (maxVotes === 0) return null;
    const found = question.answers.find(
      (a) => (a.votesCount || 0) === maxVotes
    );
    return found || null;
  }, [question?.answers]);

  const handleVote = async (answerId: string) => {
    if (!questionId || votingAnswerId) return;
    setVotingAnswerId(answerId);
    try {
      await voteAnswer(questionId, answerId);
    } catch (e) {
      alert("Không thể vote. Vui lòng thử lại.");
    } finally {
      setVotingAnswerId(null);
    }
  };

  const renderAnswerCard = (
    answer: Answer,
    options?: {
      highlightTop?: boolean;
      disableMenu?: boolean;
      keyPrefix?: string;
      hideVote?: boolean;
    }
  ) => {
    const role = (answer.author as any)?.role;
    const isMine = answer.author.id === user?.id;
    const alignClass = isMine ? "justify-end" : "justify-start";
    const isTopVoted = options?.highlightTop ? true : !!answer.isTopVoted;
    const bubbleClass = isMine
      ? isTopVoted
        ? "bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-200 shadow-lg"
        : "bg-indigo-50 border-indigo-100"
      : isTopVoted
      ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-lg"
      : "bg-white border-gray-200";

    return (
      <div
        key={`${options?.keyPrefix || "answer"}-${answer.id}`}
        id={`answer-${answer.id}`}
        className={`flex ${alignClass}`}
      >
        <div
          className={`relative w-full max-w-3xl rounded-lg border shadow-sm p-4 mb-2 ${bubbleClass}`}
        >
          {/* Edit/Delete menu for own answers */}
          {isMine &&
            question?.approvalStatus === "APPROVED" &&
            !options?.disableMenu && (
              <div
                className="absolute -left-8 bottom-0 z-10"
                ref={(el) => {
                  menuRefs.current[answer.id] = el;
                }}
              >
                {editingAnswerId !== answer.id && (
                  <>
                    <button
                      onClick={() =>
                        setOpenMenuAnswerId(
                          openMenuAnswerId === answer.id ? null : answer.id
                        )
                      }
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                      aria-label="Menu"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                    {openMenuAnswerId === answer.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
                        {(answer.editCount ?? 0) < 1 && (
                          <button
                            onClick={() => {
                              handleEditAnswer(answer);
                              setOpenMenuAnswerId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Chỉnh sửa
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleDeleteAnswer(answer.id);
                            setOpenMenuAnswerId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Xóa
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          {/* Pinned badge */}
          {answer.isPinned && (
            <div className="flex items-center text-indigo-600 mb-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span className="text-sm font-medium">Được ghim bởi CVHT</span>
            </div>
          )}

          {/* Highest voted badge */}
          {isTopVoted && (
            <div className="flex items-center mb-3">
              <div className="flex items-center text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <span className="text-sm font-semibold">
                  Câu trả lời hàng đầu
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mb-2">
            {options?.hideVote ? (
              <div className="text-sm text-gray-700 flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                <span className="font-medium">{answer.votesCount || 0}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleVote(answer.id)}
                disabled={votingAnswerId === answer.id}
                className={`flex items-center gap-1 border font-semibold ${
                  isTopVoted
                    ? "text-amber-900 border-amber-400 bg-amber-100 hover:bg-amber-200"
                    : "text-gray-900 border-gray-500 bg-white hover:bg-gray-100"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                <span className="font-medium">
                  {votingAnswerId === answer.id
                    ? "..."
                    : answer.votesCount || 0}
                </span>
              </Button>
            )}
          </div>

          <div className="prose max-w-none mb-3 pr-8">
            {(() => {
              try {
                const contentData = JSON.parse(answer.content);
                if (contentData && contentData.blocks) {
                  return (
                    <EditorJsRenderer
                      data={contentData as OutputData}
                      className="text-gray-700"
                    />
                  );
                }
              } catch (e) {
                /* ignore */
              }
              return (
                <div
                  className="wysiwyg-content text-gray-700"
                  dangerouslySetInnerHTML={{ __html: answer.content }}
                />
              );
            })()}
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="font-semibold text-gray-700">
              {answer.author.fullName}
            </span>
            <span>•</span>
            <span suppressHydrationWarning>
              {new Date(answer.createdAt).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
            {role && (
              <>
                <span>•</span>
                <span className="uppercase text-[10px] tracking-wide">
                  {role === "STUDENT" ? "SV" : role === "ADVISOR" ? "GV" : role}
                </span>
              </>
            )}
            {(answer.editCount ?? 0) > 0 && (
              <>
                <span>•</span>
                <span className="text-gray-400 italic">Đã chỉnh sửa</span>
                <span>•</span>
                <button
                  onClick={() =>
                    setViewingOriginalAnswerId(
                      viewingOriginalAnswerId === answer.id ? null : answer.id
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer font-medium"
                >
                  {viewingOriginalAnswerId === answer.id
                    ? "Ẩn câu trả lời gốc"
                    : "Xem câu trả lời gốc"}
                </button>
              </>
            )}
          </div>

          {(answer.editCount ?? 0) > 0 &&
            answer.originalContent &&
            viewingOriginalAnswerId === answer.id && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">
                    Phiên bản gốc:
                  </span>
                  <button
                    onClick={() => setViewingOriginalAnswerId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="prose max-w-none text-sm">
                  {(() => {
                    try {
                      const originalData = JSON.parse(answer.originalContent);
                      if (originalData && originalData.blocks) {
                        return (
                          <EditorJsRenderer
                            data={originalData as OutputData}
                            className="text-gray-600"
                          />
                        );
                      }
                    } catch (e) {
                      /* ignore */
                    }
                    return (
                      <div
                        className="wysiwyg-content text-gray-600"
                        dangerouslySetInnerHTML={{
                          __html: answer.originalContent,
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  // Increment view when component mounts (only once per user per question)
  useEffect(() => {
    if (questionId && user?.id) {
      incrementView(questionId);
    }
  }, [questionId, user?.id, incrementView]);

  useEffect(() => {
    if (questionId) {
      fetchQuestionDetail(questionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // Check watch status
  useEffect(() => {
    if (!questionId || !user?.id) return;

    const checkWatchStatus = async () => {
      try {
        const res = await fetch(`/api/questions/${questionId}/watch`);
        if (res.ok) {
          const data = await res.json();
          setIsWatching(data.watching || false);
        }
      } catch (error) {
        console.error("Error checking watch status:", error);
      }
    };

    checkWatchStatus();
  }, [questionId, user?.id]);

  // Toggle watch handler
  const handleToggleWatch = async () => {
    if (!questionId || !user?.id || isTogglingWatch) return;

    setIsTogglingWatch(true);
    try {
      const method = isWatching ? "DELETE" : "POST";
      const res = await fetch(`/api/questions/${questionId}/watch`, {
        method,
      });

      if (res.ok) {
        const data = await res.json();
        setIsWatching(data.watching || false);
      } else {
        const error = await res.json();
        alert(error.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Error toggling watch:", error);
      alert("Có lỗi xảy ra khi quan tâm câu hỏi");
    } finally {
      setIsTogglingWatch(false);
    }
  };

  // Scroll to answer/message when hash changes (e.g., from notification click)
  useEffect(() => {
    if (!question || isLoading) return; // Wait for question to load

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const elementId = hash.substring(1); // Remove #
      console.log("[QuestionDetail] Attempting to scroll to:", elementId);

      // Retry logic with exponential backoff
      let attempts = 0;
      const maxAttempts = 10;
      const tryScroll = () => {
        attempts++;
        const element = document.getElementById(elementId);
        if (element) {
          console.log(
            "[QuestionDetail] Found element, scrolling to:",
            elementId
          );
          // Scroll to element
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add offset for fixed header if needed
          const yOffset = -80;
          const y =
            element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });

          // Highlight the element briefly
          const originalBg = element.style.backgroundColor;
          element.style.transition = "background-color 0.3s";
          element.style.backgroundColor = "#fef3c7";
          setTimeout(() => {
            element.style.backgroundColor = originalBg || "";
          }, 2000);
        } else if (attempts < maxAttempts) {
          // Retry after a delay
          setTimeout(tryScroll, 200 * attempts);
        } else {
          console.warn(
            "[QuestionDetail] Element not found after",
            maxAttempts,
            "attempts:",
            elementId
          );
        }
      };

      // Start trying after a short delay to ensure DOM is ready
      setTimeout(tryScroll, 100);
    };

    // Scroll on mount if hash exists
    scrollToHash();

    // Listen for hash changes
    window.addEventListener("hashchange", scrollToHash);

    return () => {
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [questionId, question, isLoading]); // Re-run when question data loads

  // Socket: listen for new answers to refresh
  useEffect(() => {
    if (!questionId) return;
    if (typeof window === "undefined") return;

    // Use global singleton socket
    const socket = getSocket();
    socketRef.current = socket;

    // Set up listeners only once per question
    const handleConnect = () => {
      if (user?.id) {
        socket.emit("join-user", user.id);
      }
      socket.emit("join-question", questionId);
    };

    const handleAnswerNew = (payload: any) => {
      if (payload?.questionId === questionId) {
        // Append locally to avoid full-page loading
        addAnswerToQuestion(questionId, {
          id: payload.id,
          content: payload.content,
          isPinned: false,
          author: payload.author,
          createdAt: payload.createdAt,
          votesCount: 0,
        });
      }
    };

    const handleAnswerReplace = (payload: any) => {
      if (
        payload?.questionId === questionId ||
        payload?.answer?.questionId === questionId
      ) {
        replaceAnswer(questionId, payload.tempId, payload.answer);
      }
    };

    const handleAnswerRemoveTemp = (payload: any) => {
      if (!payload?.tempId) return;
      removeAnswer(questionId, payload.tempId);
    };

    const handleAnswerUpdated = (payload: any) => {
      if (payload?.questionId === questionId && payload?.id) {
        // Only update fields that are explicitly provided
        const updates: Partial<Answer> = {};
        if (payload.content !== undefined) updates.content = payload.content;
        if (payload.editCount !== undefined && payload.editCount !== null) {
          updates.editCount = payload.editCount;
        }
        if (payload.editedAt !== undefined) {
          updates.editedAt = payload.editedAt;
        }
        // Only update originalContent if it's explicitly provided and not null
        // This prevents overwriting existing originalContent with null/undefined
        if (
          payload.originalContent !== undefined &&
          payload.originalContent !== null
        ) {
          updates.originalContent = payload.originalContent;
        }
        updateAnswer(questionId, payload.id, updates);
      }
    };

    const handleAnswerDeleted = (payload: any) => {
      if (payload?.questionId === questionId && payload?.id) {
        removeAnswer(questionId, payload.id);
      }
    };

    const handleAnswerUpdateFailed = (payload: any) => {
      if (payload?.questionId === questionId && payload?.id) {
        console.error("[Client] Answer update failed:", payload.error);
        // Revert optimistic update
        const answer = question?.answers?.find((a) => a.id === payload.id);
        if (answer) {
          updateAnswer(questionId, payload.id, {
            content: answer.content,
            editCount: answer.editCount ?? 0,
            editedAt: answer.editedAt || null,
            originalContent: answer.originalContent || null,
          });
        }
        alert(payload.error || "Có lỗi xảy ra khi cập nhật câu trả lời");
      }
    };

    // If already connected, join immediately
    if (socket.connected) {
      handleConnect();
    } else {
      // Otherwise wait for connection
      socket.once("connect", handleConnect);
    }

    // Set up event listeners
    socket.on("answer:new", handleAnswerNew);
    socket.on("answer:replace", handleAnswerReplace);
    socket.on("answer:remove-temp", handleAnswerRemoveTemp);
    socket.on("answer:updated", handleAnswerUpdated);
    socket.on("answer:deleted", handleAnswerDeleted);
    socket.on("answer:update-failed", handleAnswerUpdateFailed);

    return () => {
      // Only leave the question room, don't disconnect the global socket
      if (socket && socket.connected && questionId) {
        socket.emit("leave-question", questionId);
      }
      // Remove listeners
      socket.off("connect", handleConnect);
      socket.off("answer:new", handleAnswerNew);
      socket.off("answer:replace", handleAnswerReplace);
      socket.off("answer:remove-temp", handleAnswerRemoveTemp);
      socket.off("answer:updated", handleAnswerUpdated);
      socket.off("answer:deleted", handleAnswerDeleted);
      socket.off("answer:update-failed", handleAnswerUpdateFailed);
      socketRef.current = null;
    };
  }, [
    questionId,
    user?.id,
    fetchQuestionDetail,
    addAnswerToQuestion,
    replaceAnswer,
    removeAnswer,
    updateAnswer,
  ]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuAnswerId) {
        const menuElement = menuRefs.current[openMenuAnswerId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuAnswerId(null);
        }
      }
    };

    if (openMenuAnswerId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuAnswerId]);

  // Handle edit answer
  const handleEditAnswer = (answer: any) => {
    try {
      const contentData = JSON.parse(answer.content);
      setEditAnswerData(contentData);
      setEditingAnswerId(answer.id);
      setEditEditorKey((k) => k + 1);
    } catch (e) {
      // If not JSON, create a simple paragraph block
      setEditAnswerData({
        blocks: [
          {
            type: "paragraph",
            data: { text: answer.content },
          },
        ],
      });
      setEditingAnswerId(answer.id);
      setEditEditorKey((k) => k + 1);
    }
  };

  const handleCancelEdit = () => {
    setEditingAnswerId(null);
    setEditAnswerData(null);
  };

  const handleUpdateAnswer = async () => {
    if (!questionId || !editingAnswerId || !editAnswerData) return;
    if (!editAnswerData.blocks || editAnswerData.blocks.length === 0) {
      alert("Vui lòng nhập nội dung trả lời");
      return;
    }

    // Find current answer to get originalContent
    const currentAnswer = question?.answers?.find(
      (a) => a.id === editingAnswerId
    );
    if (!currentAnswer) return;

    const contentToSave =
      typeof editAnswerData === "string"
        ? editAnswerData
        : JSON.stringify(editAnswerData);

    // Optimistic update - update UI immediately
    const optimisticUpdate = {
      content: contentToSave,
      editCount: ((currentAnswer.editCount ?? 0) + 1) as number,
      editedAt: new Date().toISOString(),
      originalContent: currentAnswer.originalContent || currentAnswer.content, // Save original if not already saved
    };

    updateAnswer(questionId, editingAnswerId, optimisticUpdate);

    // Close modal immediately
    setEditingAnswerId(null);
    setEditAnswerData(null);
    setEditEditorKey((k) => k + 1);

    // Emit socket event - server will persist and broadcast to all clients
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      alert("Kết nối socket không khả dụng. Vui lòng thử lại.");
      setIsUpdating(false);
      return;
    }

    setIsUpdating(true);
    let timeoutId: NodeJS.Timeout | null = null;

    socket.emit(
      "answer:update",
      {
        questionId,
        answerId: editingAnswerId,
        content: editAnswerData,
        editCount: optimisticUpdate.editCount,
        editedAt: optimisticUpdate.editedAt,
        originalContent: optimisticUpdate.originalContent,
      },
      (response: { ok?: boolean; error?: string }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setIsUpdating(false);
        if (!response.ok) {
          console.error("Update failed:", response.error);
          // Revert optimistic update on error
          if (currentAnswer) {
            updateAnswer(questionId, editingAnswerId, {
              content: currentAnswer.content,
              editCount: currentAnswer.editCount ?? 0,
              editedAt: currentAnswer.editedAt || null,
              originalContent: currentAnswer.originalContent || null,
            });
          }
          alert(response.error || "Có lỗi xảy ra khi cập nhật câu trả lời");
        } else {
          console.log("[Client] Answer update acknowledged by server");
          // Server will persist and emit "answer:updated" event
          // handleAnswerUpdated will update the UI with persisted data
        }
      }
    );

    // Set timeout for socket acknowledgment (10 seconds)
    timeoutId = setTimeout(() => {
      setIsUpdating(false);
      console.warn(
        "[Client] Socket update timeout - server may still be processing"
      );
    }, 10000);
  };

  // Handle delete answer
  const handleDeleteAnswer = async (answerId: string) => {
    if (!questionId) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa câu trả lời này? Hành động này không thể hoàn tác."
    );

    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/questions/${questionId}/answers/${answerId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Có lỗi xảy ra khi xóa câu trả lời");
        return;
      }

      // Success - socket will update the UI
      setDeletingAnswerId(null);
    } catch (error) {
      console.error("Error deleting answer:", error);
      alert("Có lỗi xảy ra khi xóa câu trả lời");
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId) return;
    if (!answerData || !answerData.blocks || answerData.blocks.length === 0) {
      alert("Vui lòng nhập nội dung trả lời");
      return;
    }

    setIsSubmitting(true);
    const payload = answerData; // snapshot to avoid state reset issues
    try {
      // Require active socket, otherwise abort and ask user to retry
      if (!socketRef.current || !socketRef.current.connected) {
        alert("Socket chưa sẵn sàng, vui lòng tải lại trang và thử lại.");
        setIsSubmitting(false);
        return;
      }

      // Clear editor immediately to avoid lingering text while waiting ack
      setAnswerData(null);
      setEditorKey((k) => k + 1);

      // Short guard to avoid stuck state; no fallback HTTP
      let done = false;
      const finish = (fn: () => void) => {
        if (done) return;
        done = true;
        fn();
      };

      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = setTimeout(() => {
        finish(() => {
          setIsSubmitting(false);
        });
      }, 4000);

      const tempId = `temp-${Date.now()}`;
      socketRef.current.emit(
        "answer:send",
        { questionId, content: payload, tempId },
        (resp: { ok?: boolean; error?: string }) => {
          if (submitTimeoutRef.current) {
            clearTimeout(submitTimeoutRef.current);
            submitTimeoutRef.current = null;
          }
          if (!resp?.ok) {
            finish(() => {
              setIsSubmitting(false);
              alert(resp?.error || "Gửi trả lời thất bại");
            });
            return;
          }
          finish(() => {
            setIsSubmitting(false);
          });
        }
      );
    } catch (error) {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      console.error("Error submitting answer:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi gửi câu trả lời"
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center h-screen flex flex-col items-center justify-center">
        <SystemPulseLogo className="w-12 h-12 mx-auto" />
        <p className="mt-4 text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Không tìm thấy câu hỏi"}
          </h2>
          <Link
            href="/questions"
            className="text-indigo-600 hover:text-indigo-700 inline-flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/questions"
        className="text-indigo-600 hover:text-indigo-700 inline-flex items-center"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Quay lại danh sách
      </Link>

      {/* Question */}
      <div className="bg-white rounded-lg shadow p-6 relative">
        {/* Watch Button - Top Right */}
        {user && (
          <button
            onClick={handleToggleWatch}
            className="absolute top-4 right-4 group cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            title="Quan tâm"
            disabled={isTogglingWatch}
          >
            <svg
              className={`w-6 h-6 transition-colors ${
                isWatching
                  ? "fill-red-500 text-red-500"
                  : "fill-none text-gray-400 hover:text-red-500"
              }`}
              fill={isWatching ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
              Quan tâm
            </span>
          </button>
        )}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="mb-4">
              <div className="flex items-center flex-wrap gap-2 mb-3">
                {/* Category Badge - Nổi bật */}
                {/* Show all categories if available, otherwise fallback to primary category */}
                {(question.categories && question.categories.length > 0
                  ? question.categories
                  : question.category
                  ? [question.category]
                  : []
                ).map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 border-2 border-indigo-300 shadow-sm"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {cat.name}
                  </span>
                ))}
                {/* Approval Status Badge */}
                {question.approvalStatus === "PENDING" && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    Chờ duyệt
                  </span>
                )}
                {question.approvalStatus === "REJECTED" && (
                  <>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                      Đã từ chối
                    </span>
                    {question.rejectionReason && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <svg
                            className="w-5 h-5 text-red-600 mr-2 mt-0.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-900 mb-1">
                              Lý do từ chối:
                            </h4>
                            <p className="text-sm text-red-800">
                              {question.rejectionReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {question.approvalStatus === "APPROVED" && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                    Đã duyệt
                  </span>
                )}
                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    question.status === "OPEN"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : question.status === "ANSWERED"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}
                >
                  {question.status === "OPEN"
                    ? "Đang mở"
                    : question.status === "ANSWERED"
                    ? "Đã trả lời"
                    : question.status === "CLOSED"
                    ? "Đã đóng"
                    : "Trùng lặp"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {question.title}
              </h1>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {question.author.fullName}
                  {(question as any).isAnonymous &&
                    question.author.id !== "anonymous" && (
                      <span
                        className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                        title="Câu hỏi ẩn danh - Chỉ bạn và CVHT/Admin mới thấy tên người đặt"
                      >
                        (ẩn danh)
                      </span>
                    )}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {question.views} lượt xem
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span suppressHydrationWarning>
                    {new Date(question.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="prose max-w-none">
          {(() => {
            // Try to parse as JSON (Editor.js format), fallback to HTML (old format)
            try {
              const contentData = JSON.parse(question.content);
              if (contentData && contentData.blocks) {
                return (
                  <EditorJsRenderer
                    data={contentData as OutputData}
                    className="text-gray-700"
                  />
                );
              }
            } catch (e) {
              // Not JSON, treat as HTML
            }
            return (
              <div
                className="wysiwyg-content text-gray-700"
                dangerouslySetInnerHTML={{ __html: question.content }}
              />
            );
          })()}
        </div>
      </div>

      {/* Answers Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">
          Câu trả lời (
          {(question.answersCount ?? 0) > 0
            ? question.answersCount
            : (question.answers?.length ?? 0) > 0
            ? question.answers?.length ?? 0
            : 0}
          )
        </h2>

        {question.answersCount === 0 || question.answers?.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Chưa có câu trả lời nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAnswers.map((answer) => {
              const role = (answer.author as any)?.role;
              const isMine = answer.author.id === user?.id;
              const alignClass = isMine ? "justify-end" : "justify-start";
              const isTopVoted = !!answer.isTopVoted;
              const bubbleClass = isMine
                ? isTopVoted
                  ? "bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-200 shadow-lg"
                  : "bg-indigo-50 border-indigo-100"
                : isTopVoted
                ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-lg"
                : "bg-white border-gray-200";
              return (
                <div
                  key={answer.id}
                  id={`answer-${answer.id}`}
                  className={`flex ${alignClass}`}
                >
                  <div
                    className={`relative w-full max-w-3xl rounded-lg border shadow-sm p-4 mb-2 ${bubbleClass}`}
                  >
                    {/* Edit/Delete menu for own answers - positioned absolutely at right center */}
                    {isMine && question.approvalStatus === "APPROVED" && (
                      <div
                        className="absolute -left-8 bottom-0 z-10"
                        ref={(el) => {
                          menuRefs.current[answer.id] = el;
                        }}
                      >
                        {editingAnswerId !== answer.id && (
                          <>
                            <button
                              onClick={() =>
                                setOpenMenuAnswerId(
                                  openMenuAnswerId === answer.id
                                    ? null
                                    : answer.id
                                )
                              }
                              className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                              aria-label="Menu"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                            {openMenuAnswerId === answer.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px] py-1">
                                {(answer.editCount ?? 0) < 1 && (
                                  <button
                                    onClick={() => {
                                      handleEditAnswer(answer);
                                      setOpenMenuAnswerId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                    Chỉnh sửa
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    handleDeleteAnswer(answer.id);
                                    setOpenMenuAnswerId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  Xóa
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {/* Pinned badge */}
                    {answer.isPinned && (
                      <div className="flex items-center text-indigo-600 mb-2">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          Được ghim bởi CVHT
                        </span>
                      </div>
                    )}

                    <div className="prose max-w-none mb-3 pr-8">
                      {(() => {
                        try {
                          const contentData = JSON.parse(answer.content);
                          if (contentData && contentData.blocks) {
                            return (
                              <EditorJsRenderer
                                data={contentData as OutputData}
                                className="text-gray-700"
                              />
                            );
                          }
                        } catch (e) {
                          /* ignore */
                        }
                        return (
                          <div
                            className="wysiwyg-content text-gray-700"
                            dangerouslySetInnerHTML={{ __html: answer.content }}
                          />
                        );
                      })()}
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">
                        {answer.author.fullName}
                      </span>
                      <span>•</span>
                      <span suppressHydrationWarning>
                        {new Date(answer.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      {role && (
                        <>
                          <span>•</span>
                          <span className="uppercase text-[10px] tracking-wide">
                            {role === "STUDENT"
                              ? "SV"
                              : role === "ADVISOR"
                              ? "GV"
                              : role}
                          </span>
                        </>
                      )}
                      {(answer.editCount ?? 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400 italic">
                            Đã chỉnh sửa
                          </span>
                          <span>•</span>
                          <button
                            onClick={() =>
                              setViewingOriginalAnswerId(
                                viewingOriginalAnswerId === answer.id
                                  ? null
                                  : answer.id
                              )
                            }
                            className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer font-medium"
                          >
                            {viewingOriginalAnswerId === answer.id
                              ? "Ẩn câu trả lời gốc"
                              : "Xem câu trả lời gốc"}
                          </button>
                        </>
                      )}
                    </div>
                    <div
                      className={`flex items-center justify-between mb-3 ${
                        isTopVoted ? "justify-between" : "justify-end"
                      }`}
                    >
                      <span></span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(answer.id)}
                        disabled={votingAnswerId === answer.id}
                        className={`flex items-center gap-1 ${
                          isTopVoted
                            ? "text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200"
                            : "border border-gray-200 text-black"
                        }`}
                      >
                        {votingAnswerId === answer.id ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                            />
                          </svg>
                        )}
                        <span className="text-sm font-medium">
                          {votingAnswerId === answer.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          ) : (
                            answer.votesCount || 0
                          )}
                        </span>
                      </Button>
                    </div>
                    {/* Show original content if edited */}
                    {(answer.editCount ?? 0) > 0 &&
                      answer.originalContent &&
                      viewingOriginalAnswerId === answer.id && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600">
                              Phiên bản gốc:
                            </span>
                            <button
                              onClick={() => setViewingOriginalAnswerId(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                          <div className="prose max-w-none text-sm">
                            {(() => {
                              try {
                                const originalData = JSON.parse(
                                  answer.originalContent
                                );
                                if (originalData && originalData.blocks) {
                                  return (
                                    <EditorJsRenderer
                                      data={originalData as OutputData}
                                      className="text-gray-600"
                                    />
                                  );
                                }
                              } catch (e) {
                                /* ignore */
                              }
                              return (
                                <div
                                  className="wysiwyg-content text-gray-600"
                                  dangerouslySetInnerHTML={{
                                    __html: answer.originalContent,
                                  }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Answer Modal */}
      {editingAnswerId && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                Chỉnh sửa câu trả lời
              </h2>
              {/* Show original content if answer was edited */}
              {(() => {
                const answer = question?.answers?.find(
                  (a) => a.id === editingAnswerId
                );
                if (
                  answer &&
                  (answer.editCount ?? 0) > 0 &&
                  answer.originalContent
                ) {
                  return (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800">
                          Phiên bản gốc (trước khi chỉnh sửa):
                        </span>
                      </div>
                      <div className="prose max-w-none text-sm">
                        {(() => {
                          try {
                            const originalData = JSON.parse(
                              answer.originalContent
                            );
                            if (originalData && originalData.blocks) {
                              return (
                                <EditorJsRenderer
                                  data={originalData as OutputData}
                                  className="text-gray-800"
                                />
                              );
                            }
                          } catch (e) {
                            /* ignore */
                          }
                          return (
                            <div
                              className="wysiwyg-content text-gray-800"
                              dangerouslySetInnerHTML={{
                                __html: answer.originalContent,
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nội dung sau chỉnh sửa:
                </label>
                {editAnswerData && (
                  <div className="text-gray-900 [&_.ce-block__content]:text-gray-900 [&_.ce-paragraph]:text-gray-900">
                    <EditorJs
                      key={editEditorKey}
                      data={editAnswerData}
                      onChange={setEditAnswerData}
                      placeholder="Nhập nội dung câu trả lời..."
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateAnswer}
                  disabled={
                    isUpdating ||
                    !editAnswerData ||
                    !editAnswerData.blocks ||
                    editAnswerData.blocks.length === 0
                  }
                  className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Answer Form (allowed only when approved) */}
      {user &&
        question.status !== "CLOSED" &&
        question.approvalStatus === "APPROVED" && (
          <div className="bg-gray-50 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Trả lời câu hỏi
            </h3>
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-visible">
                <EditorJs
                  key={editorKey}
                  data={answerData || undefined}
                  onChange={(data) => setAnswerData(data)}
                  className="text-gray-700"
                  placeholder="Nhập câu trả lời của bạn..."
                />
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi câu trả lời"}
                </button>
              </div>
            </form>
          </div>
        )}
      {user && question.approvalStatus !== "APPROVED" && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Câu hỏi chưa được duyệt/đã bị từ chối nên không thể trả lời.
        </div>
      )}

      {/* Similar Questions Section */}
      {questionId && question.approvalStatus === "APPROVED" && (
        <div className="mt-8">
          <SimilarQuestions questionId={questionId} limit={5} threshold={0.7} />
        </div>
      )}
    </div>
  );
}
