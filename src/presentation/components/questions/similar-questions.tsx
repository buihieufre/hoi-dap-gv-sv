"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";
import { EditorJsRenderer } from "@/presentation/components/editor/editor-js-renderer";

interface SimilarQuestion {
  id: string;
  title: string;
  content: string;
  similarity: number;
  author: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  views: number;
  answersCount: number;
  createdAt: string;
}

interface SimilarQuestionsProps {
  questionId: string;
  limit?: number;
  threshold?: number;
}

export function SimilarQuestions({
  questionId,
  limit = 5,
  threshold = 0.7,
}: SimilarQuestionsProps) {
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) return;

    const fetchSimilarQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(
          `/api/questions/${questionId}/similar?limit=${limit}&threshold=${threshold}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch similar questions");
        }

        const data = await response.json();
        setSimilarQuestions(data.questions || []);
      } catch (err) {
        console.error("Error fetching similar questions:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load similar questions"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarQuestions();
  }, [questionId, limit, threshold]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Câu hỏi tương tự
        </h2>
        <div className="text-center py-4">
          <SystemPulseLogo className="w-8 h-8 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Câu hỏi tương tự
        </h2>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (similarQuestions.length === 0) {
    return null; // Don't show section if no similar questions
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <svg
          className="w-5 h-5 mr-2 text-indigo-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Câu hỏi tương tự
      </h2>
      <div className="space-y-4">
        {similarQuestions.map((sq) => (
          <Link
            key={sq.id}
            href={`/questions/${sq.id}`}
            className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {sq.title}
                </h3>
                <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {(() => {
                    try {
                      const contentData =
                        typeof sq.content === "string"
                          ? JSON.parse(sq.content)
                          : sq.content;
                      return <EditorJsRenderer data={contentData} />;
                    } catch {
                      // If not JSON, display as plain text
                      return (
                        <div dangerouslySetInnerHTML={{ __html: sq.content }} />
                      );
                    }
                  })()}
                </div>
                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                  <span>{sq.author.fullName}</span>
                  <span>•</span>
                  <span>{sq.views} lượt xem</span>
                  <span>•</span>
                  <span>{sq.answersCount} câu trả lời</span>
                  {(sq.categories && sq.categories.length > 0
                    ? sq.categories
                    : sq.category
                    ? [sq.category]
                    : []
                  ).map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-4 shrink-0">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  {Math.round(sq.similarity * 100)}% tương tự
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
