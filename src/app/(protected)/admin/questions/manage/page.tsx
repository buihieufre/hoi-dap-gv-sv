"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/presentation/hooks/use-auth";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { OutputData } from "@editorjs/editorjs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/presentation/components/ui/dropdown-menu";
import { Button } from "@/presentation/components/ui/button";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";

const EditorJsRenderer = dynamic(
  () =>
    import("@/presentation/components/editor/editor-js-renderer").then(
      (mod) => ({
        default: mod.EditorJsRenderer,
      })
    ),
  { ssr: false }
);

type QuestionStatus = "OPEN" | "ANSWERED" | "CLOSED";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

interface PendingQuestion {
  id: string;
  title: string;
  content: string;
  status: QuestionStatus;
  approvalStatus: ApprovalStatus;
  author: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  views: number;
  answersCount: number;
  createdAt: string;
  updatedAt: string;
}

const statusOptions: QuestionStatus[] = ["OPEN", "ANSWERED", "CLOSED"];

const approvalFilters: (ApprovalStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const statusLabels: Record<QuestionStatus, string> = {
  OPEN: "Mở",
  ANSWERED: "Đã trả lời",
  CLOSED: "Đã đóng",
};

const approvalLabels: Record<ApprovalStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

export default function PendingQuestionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | "ALL">(
    "ALL"
  );
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | "ALL">(
    "ALL"
  );
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (approvalFilter !== "ALL") params.set("approvalStatus", approvalFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    params.set("limit", "50");
    return params.toString();
  }, [approvalFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryString]);

  // Update search state when searchQuery changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`/api/questions?${queryString}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách câu hỏi");
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError("Có lỗi xảy ra khi tải danh sách câu hỏi");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (questionId: string) => {
    try {
      setApprovingQuestionId(questionId); // Show loading overlay

      const response = await fetch(
        `/api/admin/questions/${questionId}/approve`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Không thể duyệt câu hỏi");
      }

      // Remove from list
      setQuestions(questions.filter((q) => q.id !== questionId));
    } catch (err) {
      alert("Có lỗi xảy ra khi duyệt câu hỏi");
      console.error(err);
    } finally {
      setApprovingQuestionId(null); // Hide loading overlay
    }
  };

  const [approvingQuestionId, setApprovingQuestionId] = useState<string | null>(
    null
  ); // Track which question is being approved
  const [rejectingQuestionId, setRejectingQuestionId] = useState<string | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false); // Track reject submission

  const handleReject = async (questionId: string) => {
    setRejectingQuestionId(questionId);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingQuestionId) return;
    if (!rejectionReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      setIsSubmittingReject(true);

      const response = await fetch(
        `/api/admin/questions/${rejectingQuestionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể từ chối câu hỏi");
      }

      // Remove from list
      setQuestions(questions.filter((q) => q.id !== rejectingQuestionId));
      setRejectingQuestionId(null);
      setRejectionReason("");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi từ chối câu hỏi"
      );
      console.error(err);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleUpdateStatus = async (
    questionId: string,
    status: "OPEN" | "ANSWERED" | "CLOSED"
  ) => {
    try {
      setStatusUpdatingId(questionId);
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Không thể cập nhật trạng thái");
      }
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status } : q))
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi cập nhật trạng thái"
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      setDeletingId(questionId);
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Không thể xóa câu hỏi");
      }
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa câu hỏi"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
    // Re-fetch questions with new search query
    fetchQuestions();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    fetchQuestions();
  };

  // if (authLoading || isLoading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[400px]">
  //       <div className="text-center">
  //         <SystemPulseLogo className="w-12 h-12 mx-auto" />
  //         <p className="mt-4 text-gray-600">Đang tải...</p>
  //       </div>
  //     </div>
  //   );
  // }

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý câu hỏi</h1>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu hỏi theo nội dung, tiêu đề..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Đang tìm..." : "Tìm kiếm"}
          </button>
          {(searchQuery || isSearching) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Xóa tìm kiếm
            </button>
          )}
        </form>
      </div>

      <div className="flex gap-4 flex-wrap flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Duyệt:</span>
          {approvalFilters.map((f) => (
            <button
              key={f}
              onClick={() => setApprovalFilter(f)}
              className={`px-3 py-1 rounded-full text-sm border ${
                approvalFilter === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {f === "ALL" ? "Tất cả" : approvalLabels[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Trạng thái:</span>
          {["ALL", ...statusOptions].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className={`px-3 py-1 rounded-full text-sm border ${
                statusFilter === s
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {s === "ALL" ? "Tất cả" : statusLabels[s as QuestionStatus]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <SystemPulseLogo className="w-12 h-12 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Không có câu hỏi nào phù hợp bộ lọc
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Hãy thử điều chỉnh bộ lọc để xem thêm câu hỏi.
          </p>
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow p-5 border border-gray-100"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800">
                  {approvalLabels[question.approvalStatus]}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded bg-teal-100 text-teal-800">
                  {statusLabels[question.status]}
                </span>
                {question.category && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                    {question.category.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(question.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {question.title}
                  </h3>
                  <div className="relative">
                    <div className="prose max-w-none mb-4 text-sm text-gray-600 line-clamp-3">
                      {typeof question.content === "string" ? (
                        (() => {
                          try {
                            const contentData = JSON.parse(question.content);
                            if (contentData && contentData.blocks) {
                              return (
                                <div className="editorjs-content-preview">
                                  <EditorJsRenderer
                                    data={contentData as OutputData}
                                    className="text-sm"
                                  />
                                </div>
                              );
                            }
                          } catch (e) {
                            // Not JSON
                          }
                          return (
                            <div
                              className="wysiwyg-content-preview"
                              dangerouslySetInnerHTML={{
                                __html: question.content,
                              }}
                            />
                          );
                        })()
                      ) : (
                        <div className="editorjs-content-preview">
                          <EditorJsRenderer
                            data={question.content as OutputData}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Loading Overlay chỉ cho content */}
                    {(approvingQuestionId === question.id ||
                      statusUpdatingId === question.id ||
                      deletingId === question.id) && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] flex items-center justify-center rounded-md">
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            className="animate-spin h-6 w-6 text-green-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span className="text-green-700 font-medium text-xs">
                            Đang xử lý...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {question.author?.fullName || "N/A"}
                    </span>
                    <span>Trả lời: {question.answersCount}</span>
                    <span>Lượt xem: {question.views}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Quick Actions */}
                  {question.approvalStatus === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(question.id)}
                        disabled={
                          approvingQuestionId === question.id ||
                          rejectingQuestionId === question.id
                        }
                        className="text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
                      >
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Duyệt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(question.id)}
                        disabled={
                          approvingQuestionId === question.id ||
                          rejectingQuestionId === question.id
                        }
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Từ chối
                      </Button>
                    </>
                  )}

                  {/* More Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 focus:outline-none">
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Duyệt & Từ chối
                      </div>
                      <DropdownMenuItem
                        onClick={() => handleApprove(question.id)}
                        disabled={
                          approvingQuestionId === question.id ||
                          rejectingQuestionId === question.id
                        }
                        className="text-green-600 focus:text-green-600 focus:bg-green-50 flex items-center gap-1"
                      >
                        <svg
                          className="w-5 h-5 mb-1 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs text-center">
                          Duyệt câu hỏi
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleReject(question.id)}
                        disabled={
                          approvingQuestionId === question.id ||
                          rejectingQuestionId === question.id
                        }
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-1"
                      >
                        <svg
                          className="w-5 h-5 mb-1 shrink-0"
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
                        <span className="text-xs text-center">
                          Từ chối câu hỏi
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Quản lý trạng thái
                      </div>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(question.id, "OPEN")}
                        disabled={statusUpdatingId === question.id}
                        className="text-blue-600 focus:text-blue-600 focus:bg-blue-50 flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Mở
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(question.id, "ANSWERED")
                        }
                        disabled={statusUpdatingId === question.id}
                        className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        Đã trả lời
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(question.id, "CLOSED")
                        }
                        disabled={statusUpdatingId === question.id}
                        className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Đã đóng
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Hành động khác
                      </div>
                      <DropdownMenuItem
                        onClick={() => {
                          window.location.href = `/questions/${question.id}`;
                        }}
                        className="text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50 flex items-center gap-1"
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(question.id)}
                        disabled={deletingId === question.id}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-1"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Xóa câu hỏi
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Không có câu hỏi nào phù hợp bộ lọc
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Hãy thử điều chỉnh bộ lọc để xem thêm câu hỏi.
          </p>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingQuestionId && (
        <div className="fixed inset-0 bg-gray-600/35 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Từ chối câu hỏi
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Vui lòng nhập lý do từ chối câu hỏi này
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do từ chối *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  placeholder="Ví dụ: Nội dung không phù hợp, vi phạm quy định..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingQuestionId(null);
                    setRejectionReason("");
                  }}
                  disabled={isSubmittingReject}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim() || isSubmittingReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingReject ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Đang từ chối...
                    </>
                  ) : (
                    "Xác nhận từ chối"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
