"use client";

import { useState, useEffect } from "react";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: "LINK" | "FILE" | "DOCUMENT";
  url: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  author: {
    id: string;
    fullName: string;
  };
  createdAt: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "LINK" | "FILE" | "DOCUMENT">("all");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/resources", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách tài liệu");
      }

      const data = await response.json();
      setResources(data.resources || []);
    } catch (err) {
      setError("Có lỗi xảy ra khi tải danh sách tài liệu");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Transform URL để hiển thị file inline thay vì download
   * Sử dụng Google Docs Viewer cho PDF và documents
   */
  const getViewableUrl = (url: string, mimeType: string | null, fileName: string | null) => {
    // Check if it's a PDF or document that needs Google Docs Viewer
    const isPdf = mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf") || url.toLowerCase().endsWith(".pdf");
    const isDocument = mimeType?.includes("word") || mimeType?.includes("document") || 
                       fileName?.toLowerCase().match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/);
    
    // Sử dụng Google Docs Viewer cho PDF và documents từ Cloudinary raw
    if ((isPdf || isDocument) && url.includes("cloudinary.com")) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    
    return url;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LINK":
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        );
      case "FILE":
        return (
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "DOCUMENT":
        return (
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "LINK":
        return "Link";
      case "FILE":
        return "File";
      case "DOCUMENT":
        return "Tài liệu";
      default:
        return type;
    }
  };

  const filteredResources = filter === "all" 
    ? resources 
    : resources.filter((r) => r.type === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <SystemPulseLogo className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tài liệu tham khảo</h1>
        <p className="mt-2 text-gray-600">
          Các tài liệu, link hữu ích được chia sẻ bởi Admin
        </p>
      </div>

      {/* Filter */}
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
          onClick={() => setFilter("LINK")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "LINK"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Link
        </button>
        <button
          onClick={() => setFilter("FILE")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "FILE"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          File
        </button>
        <button
          onClick={() => setFilter("DOCUMENT")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "DOCUMENT"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tài liệu
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Chưa có tài liệu nào
          </h3>
          <p className="mt-2 text-gray-500">
            {filter === "all"
              ? "Hiện tại chưa có tài liệu tham khảo nào được chia sẻ."
              : `Không có tài liệu loại "${getTypeLabel(filter)}" nào.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tài liệu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(resource.type)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {resource.title}
                        </div>
                        {resource.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {resource.description}
                          </div>
                        )}
                        {resource.fileName && (
                          <div className="text-xs text-gray-400 mt-1">
                            {resource.fileName} {resource.fileSize && `(${formatFileSize(resource.fileSize)})`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      resource.type === "LINK"
                        ? "bg-blue-100 text-blue-800"
                        : resource.type === "FILE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {getTypeLabel(resource.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(resource.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <a
                      href={getViewableUrl(resource.url, resource.mimeType, resource.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <span>Xem</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

