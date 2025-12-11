/** Client component: toggle push notification preference */
"use client";

import { useEffect, useState } from "react";

const PREF_KEY = "notifications-enabled";

export function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const val = localStorage.getItem(PREF_KEY) === "true";
    setEnabled(val);
    setReady(true);
  }, []);

  const toggle = async () => {
    if (typeof window === "undefined") return;
    const next = !enabled;
    localStorage.setItem(PREF_KEY, next ? "true" : "false");
    window.dispatchEvent(new Event("notifications-preference-changed"));
    setEnabled(next);
  };

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
        enabled
          ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
      }`}
      title="Bật/tắt thông báo đẩy"
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
          d={
            enabled
              ? "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              : "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11c0-3.314-2.686-6-6-6m6 12v1a3 3 0 11-6 0v-1m0-12a2 2 0 10-4 0v.341M4 4l16 16"
          }
        />
      </svg>
      {enabled ? "Thông báo: Bật" : "Thông báo: Tắt"}
    </button>
  );
}

