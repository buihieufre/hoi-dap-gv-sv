/** Client component: register SW, request permission, get FCM token, save to backend */
"use client";

import { useEffect, useState } from "react";
import { messagingPromise } from "@/infrastructure/firebase/firebase-client";
import { getToken, isSupported } from "firebase/messaging";
import { useAuth } from "@/presentation/hooks/use-auth";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const PREF_KEY = "notifications-enabled";
const TOKEN_KEY = "fcm-token";

async function saveToken(token: string) {
  try {
    const res = await fetch("/api/notifications/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: token, userAgent: navigator.userAgent }),
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const err: any = new Error(error.message || "Failed to save token");
      err.status = res.status;
      throw err;
    }
    localStorage.setItem(TOKEN_KEY, token);
    console.log("[FCM] Token saved to localStorage");
  } catch (e: any) {
    console.error("[FCM] Failed to save FCM token:", e?.message || e);
    throw e; // Re-throw so caller can handle
  }
}

async function deleteTokenOnServer(token: string) {
  try {
    await fetch("/api/notifications/token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: token }),
    });
  } catch (e) {
    console.error("Failed to delete FCM token", e);
  }
}

export function FcmInitializer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blockedAuth, setBlockedAuth] = useState(false); // stop retry if 401

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = localStorage.getItem(PREF_KEY) === "true";
    setEnabled(initial);

    const onPrefChange = () => {
      const val = localStorage.getItem(PREF_KEY) === "true";
      setEnabled(val);
    };
    window.addEventListener("notifications-preference-changed", onPrefChange);
    window.addEventListener("storage", (e) => {
      if (e.key === PREF_KEY) {
        onPrefChange();
      }
    });
    return () => {
      window.removeEventListener(
        "notifications-preference-changed",
        onPrefChange
      );
    };
  }, []);

  useEffect(() => {
    if (enabled === null) return;
    if (isLoading) return; // Wait for auth to load

    let cancelled = false;

    async function disableAndCleanup() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        await deleteTokenOnServer(storedToken);
        localStorage.removeItem(TOKEN_KEY);
      }
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      if (regs) {
        await Promise.all(
          regs
            .filter((r) =>
              r.active?.scriptURL.endsWith("firebase-messaging-sw.js")
            )
            .map((r) => r.unregister())
        );
      }
    }

    async function setup() {
      if (!enabled) {
        await disableAndCleanup();
        return;
      }
      if (typeof window === "undefined") return;
      if (blockedAuth) return;
      if (!VAPID_KEY) {
        console.warn("[FCM] Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY, skip FCM");
        return;
      }
      // Check if user is authenticated (using useAuth hook)
      if (!isAuthenticated || !user) {
        console.log("[FCM] User not authenticated, skipping FCM setup");
        return;
      }
      const supported = await isSupported().catch(() => false);
      if (!supported) {
        console.warn("[FCM] Messaging not supported in this browser.");
        return;
      }

      try {
        console.log("[FCM] Registering service worker...");
        const reg = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        await navigator.serviceWorker.ready;
        console.log("[FCM] Service worker registered");

        if (Notification.permission === "default") {
          console.log("[FCM] Requesting notification permission...");
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") {
          console.warn(
            `[FCM] Notification permission: ${Notification.permission}`
          );
          return;
        }
        console.log("[FCM] Notification permission granted");

        const messaging = await messagingPromise;
        if (!messaging) {
          console.warn("[FCM] Messaging not available");
          return;
        }

        console.log("[FCM] Getting FCM token...");
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (!token) {
          console.warn("[FCM] No FCM token received");
          return;
        }
        console.log(`[FCM] Got token: ${token.substring(0, 20)}...`);

        if (!cancelled) {
          try {
            console.log("[FCM] Saving token to server...");
            await saveToken(token);
            console.log("[FCM] ✓ Token saved successfully");
          } catch (err: any) {
            console.error("[FCM] ✗ Failed to save token:", err);
            if (err?.status === 401) {
              setBlockedAuth(true);
            }
          }
        }
      } catch (err) {
        console.error("[FCM] ✗ FCM init failed:", err);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, user, isLoading]);

  return null;
}
