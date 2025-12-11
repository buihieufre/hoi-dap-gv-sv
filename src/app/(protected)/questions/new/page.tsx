"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";
import { OutputData } from "@editorjs/editorjs";
import { useAuth } from "@/presentation/hooks/use-auth";
import { CreateAcademicCategoryModal } from "@/presentation/components/categories/create-academic-category-modal";
import { CategoryCombobox } from "@/presentation/components/categories/category-combobox";
import { CategoryMultiSelect } from "@/presentation/components/categories/category-multi-select";
import anonymousIcon from "@/presentation/assets/icons/spy.svg";
// Dynamic import với ssr: false để tránh hydration mismatch
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

interface Category {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  type?: "SYSTEM" | "ACADEMIC";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
}

export default function NewQuestionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<OutputData | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false); // Toggle ẩn danh

  // Load categories on mount (only approved categories)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch("/api/categories?approvalStatus=APPROVED");
        if (!response.ok) throw new Error("Failed to fetch categories");
        const data = await response.json();
        // Filter to only show approved categories
        const approvedCategories = (data.categories || []).filter(
          (cat: any) => cat.approvalStatus === "APPROVED"
        );
        setCategories(approvedCategories);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Không thể tải danh mục. Vui lòng thử lại sau.");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Use categoryIds if available, otherwise fallback to categoryId
      const finalCategoryIds =
        categoryIds.length > 0 ? categoryIds : categoryId ? [categoryId] : [];

      if (finalCategoryIds.length === 0) {
        setError("Vui lòng chọn ít nhất một danh mục");
        setIsLoading(false);
        return;
      }

      if (!content || !content.blocks || content.blocks.length === 0) {
        setError("Vui lòng nhập nội dung câu hỏi");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: JSON.stringify(content), // Convert to JSON string for storage
          categoryId: finalCategoryIds[0], // Primary category (backward compatibility)
          categoryIds: finalCategoryIds, // All categories
          isAnonymous, // Đặt câu hỏi ẩn danh
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Failed to create question"
        );
      }

      const data = await response.json();
      router.push(`/questions/${data.question.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create question"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/questions"
          className="text-indigo-600 hover:text-indigo-700 mb-4 inline-flex items-center"
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
        <h1 className="text-3xl font-bold text-gray-900">Đặt câu hỏi mới</h1>
        <p className="text-gray-600 mt-1">
          Hãy mô tả câu hỏi của bạn một cách rõ ràng và chi tiết
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 rounded-lg shadow p-6 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tiêu đề câu hỏi *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
            placeholder="Ví dụ: Làm thế nào để đăng ký môn học tự chọn?"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Danh mục * (có thể chọn nhiều)
            </label>
            {(user?.role === "STUDENT" || user?.role === "ADVISOR") && (
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Tạo danh mục học thuật
              </button>
            )}
          </div>
          <CategoryMultiSelect
            categories={categories}
            value={categoryIds}
            onValueChange={(ids) => {
              setCategoryIds(ids);
              // Also set primary categoryId for backward compatibility
              if (ids.length > 0) {
                setCategoryId(ids[0]);
              } else {
                setCategoryId("");
              }
            }}
            isLoading={isLoadingCategories}
            placeholder="Chọn danh mục (có thể chọn nhiều)"
            className="w-full"
          />
          {categories.length === 0 && !isLoadingCategories && (
            <p className="mt-1 text-sm text-red-600">
              Không có danh mục nào. Vui lòng liên hệ quản trị viên.
            </p>
          )}
        </div>

        {/* Create Academic Category Modal */}

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Nội dung câu hỏi *
          </label>
          <EditorJs
            data={content || undefined}
            onChange={setContent}
            placeholder="Mô tả chi tiết câu hỏi của bạn... Bạn có thể sử dụng các công cụ định dạng ở trên."
          />
          <p className="mt-2 text-sm text-gray-500">
            Sử dụng thanh công cụ để định dạng văn bản, thêm danh sách, code
            blocks, v.v.
          </p>
        </div>

        {/* Anonymous Toggle - Only show for students */}
        {user?.role === "STUDENT" && (
          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              {isAnonymous ? (
                <img
                  src={anonymousIcon.src}
                  alt="Anonymous"
                  className="w-5 h-5 text-indigo-600"
                />
              ) : (
                <svg
                  className={`w-5 h-5 text-gray-400`}
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
              )}
              <div>
                <p className="font-medium text-gray-900">Đặt câu hỏi ẩn danh</p>
                <p className="text-sm text-gray-500">
                  {isAnonymous
                    ? "Sinh viên khác sẽ không thấy tên của bạn. Giảng viên và Admin vẫn có thể xem."
                    : "Tên của bạn sẽ hiển thị công khai cho mọi người."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isAnonymous ? "bg-indigo-600" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={isAnonymous}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAnonymous ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <Link
            href="/questions"
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Đang tạo..." : "Đăng câu hỏi"}
          </button>
        </div>
      </form>
      <CreateAcademicCategoryModal
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSuccess={() => {
          // Reload categories after creating new one
          const fetchCategories = async () => {
            try {
              setIsLoadingCategories(true);
              const response = await fetch(
                "/api/categories?approvalStatus=APPROVED"
              );
              if (!response.ok) throw new Error("Failed to fetch categories");
              const data = await response.json();
              const approvedCategories = (data.categories || []).filter(
                (cat: any) => cat.approvalStatus === "APPROVED"
              );
              setCategories(approvedCategories);
            } catch (err) {
              console.error("Error loading categories:", err);
            } finally {
              setIsLoadingCategories(false);
            }
          };
          fetchCategories();
        }}
      />
    </div>
  );
}
