"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/presentation/hooks/use-auth";
import {
  CyberBuildLogo,
  SystemPulseLogo,
} from "@/presentation/components/logo/logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "ADMIN") {
        router.push("/dashboard");
      } else if (user.role === "STUDENT") {
        router.push("/student");
      } else if (user.role === "ADVISOR") {
        router.push("/advisor");
      } else {
        router.push("/");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await login(email, password);
      // Redirect dựa trên role sau khi login thành công
      if (data.user.role === "ADMIN") {
        router.push("/dashboard");
      } else if (data.user.role === "STUDENT") {
        router.push("/student");
      } else if (data.user.role === "ADVISOR") {
        router.push("/advisor");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị loading nếu đang check auth hoặc đang redirect
  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <SystemPulseLogo className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-gray-600">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo & Back Link */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <a href="/">
              <CyberBuildLogo className="w-12 h-12" />
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
              <p className="text-sm text-gray-600">Hỏi - Đáp CNTT</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-gray-50 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Ghi nhớ đăng nhập
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-indigo-800">
              <p className="font-medium mb-1">Dành cho Sinh viên & CVHT</p>
              <p className="text-indigo-700">
                Sử dụng email và mật khẩu đã được cấp để đăng nhập vào hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
