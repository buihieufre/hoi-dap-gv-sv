"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/hooks/use-auth";
import { useRouter } from "next/navigation";
import { SystemPulseLogo } from "@/presentation/components/logo/logo";
import { useStatsStore } from "@/presentation/stores/stats.store";
import { StatsCardSkeleton } from "@/presentation/components/skeleton/stats-card-skeleton";

export default function StudentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { stats, isLoading, fetchStats } = useStatsStore();

  useEffect(() => {
    if (!authLoading && user?.role !== "STUDENT") {
      // Redirect nếu không phải student
      if (user?.role === "ADMIN") {
        router.push("/dashboard");
      } else if (user?.role === "ADVISOR") {
        router.push("/advisor");
      } else {
        router.push("/");
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === "STUDENT") {
      fetchStats();
    }
  }, [user, fetchStats]);

  if (authLoading) {
    return (
      <div className="text-center py-12">
        <SystemPulseLogo className="w-12 h-12 mx-auto" />
        <p className="mt-4 text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (user?.role !== "STUDENT") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Chào mừng, {user?.fullName}!
        </h1>
        <p className="text-green-100">
          Bạn có câu hỏi nào cần hỏi không? Hãy đặt câu hỏi để nhận được sự hỗ
          trợ từ Cố vấn học tập.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Câu hỏi của tôi</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.myQuestions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
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
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Câu hỏi đã trả lời</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.answeredQuestions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
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
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Đang chờ trả lời</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.openQuestions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/questions/new"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
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
            </div>
            <div>
              <p className="font-semibold text-gray-900">Đặt câu hỏi mới</p>
              <p className="text-sm text-gray-600">
                Tạo câu hỏi để nhận hỗ trợ
              </p>
            </div>
          </Link>

          <Link
            href="/questions"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
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
            <div>
              <p className="font-semibold text-gray-900">Xem tất cả câu hỏi</p>
              <p className="text-sm text-gray-600">Tìm kiếm câu hỏi</p>
            </div>
          </Link>

          <Link
            href="/profile"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
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
            </div>
            <div>
              <p className="font-semibold text-gray-900">Hồ sơ của tôi</p>
              <p className="text-sm text-gray-600">Xem và chỉnh sửa</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
