"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/hooks/use-auth";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";
import { useQuestionsStore } from "@/presentation/stores/questions.store";
import { useCategoriesStore } from "@/presentation/stores/categories.store";
import { CategoryCombobox } from "@/presentation/components/categories/category-combobox";

export default function QuestionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<
    "all" | "my" | "unanswered" | "rejected"
  >("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const {
    questions,
    isLoading,
    filters,
    setFilters,
    fetchQuestions,
    searchQuestions,
  } = useQuestionsStore();

  const {
    categories,
    isLoading: isLoadingCategories,
    fetchCategories,
  } = useCategoriesStore();

  // Fetch categories for all users (only APPROVED categories for non-admin)
  useEffect(() => {
    if (!authLoading) {
      fetchCategories({
        approvalStatus: user?.role === "ADMIN" ? undefined : "APPROVED",
      });
    }
  }, [user?.role, authLoading, fetchCategories]);

  // Build filters based on current filter type
  const buildFilters = () => {
    const newFilters: any = {
      authorId: undefined,
      status: undefined,
      approvalStatus: undefined,
      categoryId: undefined,
    };

    // Set filters based on filter type
    if (filter === "my" && user?.id) {
      newFilters.authorId = user.id;
    } else if (filter === "unanswered") {
      newFilters.status = "OPEN";
    } else if (filter === "rejected") {
      // For rejected questions:
      // - ADMIN can see all rejected questions
      // - Other users can only see their own rejected questions
      newFilters.approvalStatus = "REJECTED";
      if (user?.role !== "ADMIN" && user?.id) {
        newFilters.authorId = user.id; // Only show own rejected questions for non-admin
      }
    }

    // Category filter - available for all users
    if (selectedCategoryId) {
      newFilters.categoryId = selectedCategoryId;
    }

    return newFilters;
  };

  // Handle search (with current filters)
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Build and set filters first
    const newFilters = buildFilters();
    setFilters(newFilters);

    if (!searchQuery.trim() && selectedTags.length === 0) {
      setIsSearching(false);
      // If no search query and no tags, fetch normally
      fetchQuestions();
      return;
    }

    setIsSearching(true);
    searchQuestions(searchQuery.trim(), selectedTags);
  };

  // Handle normal fetch (without search)
  const handleFetchQuestions = () => {
    const newFilters = buildFilters();
    setFilters(newFilters);
    fetchQuestions();
  };

  // Update filters and fetch/search questions
  useEffect(() => {
    if (authLoading) return;

    // If we're in search mode, re-run search with updated filters
    if (isSearching && searchQuery.trim()) {
      const newFilters = buildFilters();
      setFilters(newFilters);
      searchQuestions(searchQuery.trim(), selectedTags);
    } else {
      // Normal fetch
      handleFetchQuestions();
    }
  }, [filter, user?.id, user?.role, selectedCategoryId, authLoading]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Câu hỏi</h1>
          <p className="text-gray-600 mt-1">Tất cả câu hỏi trong hệ thống</p>
        </div>
        <Link
          href="/questions/new"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          Đặt câu hỏi mới
        </Link>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
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
          {(searchQuery || selectedTags.length > 0 || isSearching) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTags([]);
                setIsSearching(false);
                // Fetch without search after clearing
                const newFilters = buildFilters();
                setFilters(newFilters);
                fetchQuestions();
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Xóa tìm kiếm
            </button>
          )}
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("my")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "my"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Câu hỏi của tôi
            </button>
            {(user?.role === "ADVISOR" || user?.role === "ADMIN") && (
              <button
                onClick={() => setFilter("unanswered")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "unanswered"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Chưa trả lời
              </button>
            )}
            <button
              onClick={() => setFilter("rejected")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "rejected"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Bị từ chối
            </button>
          </div>

          {/* Category Filter - Available for all users */}
          <div className="flex-1 md:max-w-xs">
            <CategoryCombobox
              categories={categories}
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              isLoading={isLoadingCategories}
              placeholder="Tất cả danh mục"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <SystemPulseLogo className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Chưa có câu hỏi nào
          </h3>
          <p className="text-gray-600 mb-6">
            Hãy là người đầu tiên đặt câu hỏi!
          </p>
          <Link
            href="/questions/new"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Đặt câu hỏi mới
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Link
              key={question.id}
              href={`/questions/${question.id}`}
              className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        {/* Category Badges - Nổi bật */}
                        {/* Show all categories if available, otherwise fallback to primary category */}
                        {(question.categories && question.categories.length > 0
                          ? question.categories
                          : question.category
                          ? [question.category]
                          : []
                        ).map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
                          >
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
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {cat.name}
                          </span>
                        ))}
                        {/* Tags */}
                        {question.tags && question.tags.length > 0 && (
                          <>
                            {question.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {question.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                                +{question.tags.length - 3}
                              </span>
                            )}
                          </>
                        )}
                        {/* Approval Status Badge */}
                        {question.approvalStatus === "PENDING" && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Chờ duyệt
                          </span>
                        )}
                        {question.approvalStatus === "REJECTED" && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            Đã từ chối
                          </span>
                        )}
                        {question.approvalStatus === "APPROVED" && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Đã duyệt
                          </span>
                        )}
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            question.status === "OPEN"
                              ? "bg-green-100 text-green-800"
                              : question.status === "ANSWERED"
                              ? "bg-blue-100 text-blue-800"
                              : question.status === "CLOSED"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-orange-100 text-orange-800"
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
                      <h3 className="text-xl font-semibold text-gray-900">
                        {question.title}
                      </h3>
                    </div>
                  </div>
                  {/* Image Preview */}
                  {question.images && question.images.length > 0 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                      {question.images.slice(0, 3).map((imageUrl, idx) => (
                        <div
                          key={idx}
                          className="shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                        >
                          <img
                            src={imageUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {question.images.length > 3 && (
                        <div className="shrink-0 w-24 h-24 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                          +{question.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="text-gray-600 mb-4 line-clamp-3">
                    {question.preview ? (
                      <p className="line-clamp-3">{question.preview}</p>
                    ) : (
                      (() => {
                        // Fallback: Try to parse as JSON (Editor.js format), fallback to HTML (old format)
                        try {
                          const contentData = JSON.parse(question.content);
                          if (contentData && contentData.blocks) {
                            // Extract text from first few blocks for preview
                            const previewText = contentData.blocks
                              .slice(0, 2)
                              .map((block: any) => {
                                if (block.type === "paragraph") {
                                  return block.data.text.replace(
                                    /<[^>]*>/g,
                                    ""
                                  );
                                }
                                if (block.type === "header") {
                                  return block.data.text;
                                }
                                return "";
                              })
                              .join(" ")
                              .substring(0, 150);
                            return (
                              <p className="line-clamp-3">{previewText}...</p>
                            );
                          }
                        } catch (e) {
                          // Not JSON, treat as HTML
                        }
                        return (
                          <div
                            className="wysiwyg-content-preview line-clamp-3"
                            dangerouslySetInnerHTML={{
                              __html: question.content,
                            }}
                          />
                        );
                      })()
                    )}
                  </div>
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
                      {question.author?.fullName || "Unknown"}
                      {question.isAnonymous &&
                        question.author?.id !== "anonymous" && (
                          <span
                            className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500"
                            title="Câu hỏi ẩn danh"
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
                      {question.views || 0} lượt xem
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      {question.answersCount || 0} câu trả lời
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
                        {question.createdAt
                          ? new Date(question.createdAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : ""}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
