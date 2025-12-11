"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/presentation/hooks/use-auth";
import {
  CyberBuildLogo,
  SystemPulseLogo,
} from "@/presentation/components/logo/logo";
import { FcmInitializer } from "@/presentation/components/notifications/fcm-initializer";
import { NotificationToggle } from "@/presentation/components/notifications/notification-toggle";
import { getSocket } from "@/shared/socket-client";
import { NotificationsBell } from "@/presentation/components/notifications/notifications-bell";

// Scroll to top button component
function ScrollToTopButton() {
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Find the scrollable container
    const findScrollContainer = () => {
      // Try to find the main scroll container by ID
      const container = document.getElementById(
        "main-scroll-container"
      ) as HTMLDivElement;
      return container || document.documentElement;
    };

    const scrollContainer = findScrollContainer();
    containerRef.current = scrollContainer as HTMLDivElement;

    const handleScroll = () => {
      const container = containerRef.current || findScrollContainer();

      // Check if it's window scroll or container scroll
      const isWindowScroll = container === document.documentElement;

      const scrollY = isWindowScroll
        ? window.scrollY
        : (container as HTMLDivElement).scrollTop;

      const containerHeight = isWindowScroll
        ? window.innerHeight
        : (container as HTMLDivElement).clientHeight;

      const scrollHeight = isWindowScroll
        ? document.documentElement.scrollHeight
        : (container as HTMLDivElement).scrollHeight;

      // Show button if:
      // 1. Scrolled more than 1.5x container height from top, OR
      // 2. Near the bottom (within 100px from bottom)
      const shouldShow =
        scrollY > containerHeight * 1.5 ||
        scrollY + containerHeight >= scrollHeight - 100;

      setShowButton(shouldShow);
    };

    // Listen to scroll on both window and container
    window.addEventListener("scroll", handleScroll, true);
    if (scrollContainer !== document.documentElement) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      if (scrollContainer !== document.documentElement) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    const container =
      containerRef.current ||
      (document.getElementById("main-scroll-container") as HTMLDivElement);

    if (container && container !== document.documentElement) {
      // Scroll container
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      // Scroll window
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!showButton) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-110"
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}

/**
 * Protected Layout với Sidebar bên trái
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Suppress ERR_BLOCKED_BY_CLIENT errors from Google Analytics
  // These occur when ad blockers or privacy extensions block tracking
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(" ");
      // Suppress ERR_BLOCKED_BY_CLIENT errors from Google Analytics
      if (
        errorMessage.includes("ERR_BLOCKED_BY_CLIENT") ||
        errorMessage.includes("google-analytics.com") ||
        errorMessage.includes("googletagmanager.com")
      ) {
        // Silently ignore these errors
        return;
      }
      // Log other errors normally
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Pre-connect socket once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const s = getSocket();
      // Join user room when available
      if (user?.id) {
        s.emit("join-user", user.id);
      }
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    // Redirect to login if not authenticated after loading completes
    if (!isLoading && !isAuthenticated) {
      // Clear any stale auth data
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-storage");
      }
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <SystemPulseLogo className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getHomeHref = () => {
    if (user?.role === "ADMIN") return "/dashboard";
    if (user?.role === "STUDENT") return "/student";
    if (user?.role === "ADVISOR") return "/advisor";
    return "/dashboard";
  };

  const navigation = [
    {
      name: "Trang chủ",
      href: getHomeHref(),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Câu hỏi",
      href: "/questions",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      name: "Đặt câu hỏi",
      href: "/questions/new",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      name: "Tài liệu",
      href: "/resources",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },

    ...(user?.role === "ADMIN" || user?.role === "ADVISOR"
      ? [
          {
            name: "Danh mục",
            href: "/admin/categories",
            icon: (
              <svg
                className="w-5 h-5"
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
            ),
          },
        ]
      : []),
    ...(user?.role === "ADMIN"
      ? [
          {
            name: "Quản lý câu hỏi",
            href: "/admin/questions/manage",
            icon: (
              <svg
                className="w-5 h-5"
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
            ),
          },
          {
            name: "Quản lý người dùng",
            href: "/admin/users",
            icon: (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ),
          },
          {
            name: "Quản lý tài liệu",
            href: "/admin/resources",
            icon: (
              <svg
                className="w-5 h-5"
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
            ),
          },
          {
            name: "Quản trị",
            href: "/admin",
            icon: (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            ),
          },
          {
            name: "Hồ sơ",
            href: "/profile",
            icon: (
              <svg
                className="w-5 h-5"
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
            ),
          },
        ]
      : []),
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FcmInitializer />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600/35 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link
              href={getHomeHref()}
              className="flex items-center space-x-2"
              onClick={() => setSidebarOpen(false)}
            >
              <CyberBuildLogo className="w-10 h-10" />
              <span className="font-bold text-gray-900">Hỏi - Đáp CNTT</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
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

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-semibold text-sm">
                  {user?.fullName?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Header */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-50 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Mobile logo */}
          <Link
            href={getHomeHref()}
            className="lg:hidden ml-4 flex items-center space-x-2"
          >
            <CyberBuildLogo className="w-10 h-10" />
            <span className="font-bold text-gray-900">Hỏi - Đáp CNTT</span>
          </Link>

          {/* Desktop: Spacer */}
          <div className="hidden lg:block flex-1" />

          {/* Notification controls */}
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <NotificationToggle />
          </div>
        </header>

        {/* Page Content with padding for fixed header */}
        <main className="flex-1 h-auto pt-16">
          <div
            id="main-scroll-container"
            className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto bg-white max-h-[calc(100vh-64px)]"
          >
            {children}
          </div>
        </main>

        {/* Scroll to top button */}
        <ScrollToTopButton />
      </div>
    </div>
  );
}
