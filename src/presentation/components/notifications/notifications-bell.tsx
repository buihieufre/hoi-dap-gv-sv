"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSocket } from "@/shared/socket-client";
import {
  useNotificationsStore,
  NotificationItem,
} from "@/presentation/stores/notifications.store";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { items, unread, fetchNotifications, addNotification, markAllRead } =
    useNotificationsStore();
  const handlerRef = useRef<((payload: any) => void) | null>(null);
  const listenerSetupRef = useRef(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const socket = getSocket();

    // Create handler function only once (persist across re-renders)
    if (!handlerRef.current) {
      handlerRef.current = (payload: any) => {
        console.log(
          "[NotificationsBell] Received notification:new event",
          payload
        );
        const notif: NotificationItem = {
          id: payload?.id || `temp-${Date.now()}`,
          title: payload?.title || "Thông báo mới",
          content: payload?.body || payload?.content || "",
          isRead: false,
          link: payload?.link,
          createdAt: payload?.createdAt || new Date().toISOString(),
        };
        console.log(
          "[NotificationsBell] Adding notification to store:",
          notif.id
        );
        addNotification(notif);
      };
    }

    const handler = handlerRef.current;

    // Always remove existing listener first to prevent duplicates
    socket.off("notification:new", handler);

    // Setup listener based on connection state
    const setupListener = () => {
      // Remove before adding to ensure no duplicates
      socket.off("notification:new", handler);
      socket.on("notification:new", handler);
      console.log("[NotificationsBell] ✓ Notification listener setup");
    };

    let connectHandler: (() => void) | null = null;

    if (socket.connected) {
      console.log("[NotificationsBell] Socket connected, setting up listener");
      setupListener();
    } else {
      console.log(
        "[NotificationsBell] Socket not connected, waiting for connect event"
      );
      connectHandler = () => {
        console.log(
          "[NotificationsBell] Socket connected, setting up listener"
        );
        setupListener();
      };
      socket.once("connect", connectHandler);
    }

    return () => {
      console.log("[NotificationsBell] Cleaning up notification listener");
      socket.off("notification:new", handler);
      if (connectHandler) {
        socket.off("connect", connectHandler);
      }
    };
  }, [addNotification]);

  useEffect(() => {
    if (open) {
      markAllRead();
    }
  }, [open, markAllRead]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100"
        title="Thông báo"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
          <div className="px-4 py-2 border-b border-gray-100 font-semibold text-gray-800">
            Thông báo
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                Chưa có thông báo nào
              </div>
            ) : (
              items.map((n) => {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  setOpen(false);
                  if (n.link) {
                    console.log(
                      "[NotificationsBell] Clicked notification link:",
                      n.link
                    );
                    // Extract hash from link
                    const url = new URL(n.link, window.location.origin);
                    const hash = url.hash;
                    const elementId = hash ? hash.substring(1) : null;

                    console.log(
                      "[NotificationsBell] Hash:",
                      hash,
                      "Element ID:",
                      elementId
                    );

                    // Navigate to the page (this will trigger the scroll logic in the page component)
                    router.push(n.link);

                    // Also manually trigger scroll after navigation completes
                    // Use a longer delay to ensure page has loaded
                    setTimeout(() => {
                      if (elementId) {
                        console.log(
                          "[NotificationsBell] Attempting manual scroll to:",
                          elementId
                        );
                        let attempts = 0;
                        const maxAttempts = 20;
                        const tryScroll = () => {
                          attempts++;
                          const element = document.getElementById(elementId);
                          console.log(
                            `[NotificationsBell] Attempt ${attempts}:`,
                            element ? "Found" : "Not found",
                            elementId
                          );
                          if (element) {
                            console.log(
                              "[NotificationsBell] Scrolling to element:",
                              elementId
                            );
                            const yOffset = -100;
                            const y =
                              element.getBoundingClientRect().top +
                              window.pageYOffset +
                              yOffset;
                            window.scrollTo({ top: y, behavior: "smooth" });
                            // Highlight briefly
                            element.style.transition = "background-color 0.3s";
                            element.style.backgroundColor = "#fef3c7";
                            setTimeout(() => {
                              element.style.backgroundColor = "";
                            }, 2000);
                          } else if (attempts < maxAttempts) {
                            setTimeout(tryScroll, 300);
                          } else {
                            console.warn(
                              "[NotificationsBell] Failed to find element after",
                              maxAttempts,
                              "attempts:",
                              elementId
                            );
                          }
                        };
                        tryScroll();
                      }
                    }, 800);
                  }
                };

                return (
                  <a
                    key={n.id}
                    href={n.link || "#"}
                    className={`block px-4 py-3 text-sm ${
                      n.isRead ? "bg-white" : "bg-indigo-50"
                    } hover:bg-gray-50 border-b border-gray-100 cursor-pointer`}
                    onClick={handleClick}
                  >
                    <div className="font-semibold text-gray-900">
                      {n.title || "Thông báo"}
                    </div>
                    <div className="text-gray-700">{n.content}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
