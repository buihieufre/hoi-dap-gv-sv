import { io, Socket } from "socket.io-client";
let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") {
    // Server-side rendering - return null
    return null;
  }

  if (!socket) {
    console.log("[Socket Client] Creating new socket instance...");

    // Use NEXT_PUBLIC_SOCKET_URL if set (Railway), otherwise use same origin (Vercel/local)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "/";
    const socketPath = process.env.NEXT_PUBLIC_SOCKET_URL
      ? "/socket.io" // Railway server uses /socket.io (matches server.ts)
      : "/api/socket"; // Vercel/local uses /api/socket

    const isCrossOrigin =
      socketUrl !== "/" && !socketUrl.startsWith(window.location.origin);

    console.log("[Socket Client] Connection config:", {
      socketUrl,
      socketPath,
      currentOrigin: window.location.origin,
      isCrossOrigin,
    });

    socket = io(socketUrl, {
      path: socketPath,
      transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Reconnect forever
      reconnectionDelay: 10000, // 10 second delay
      reconnectionDelayMax: 50000, // 50 second max delay
      timeout: 20000, // 20 second timeout
      withCredentials: true, // CRITICAL: Send cookies for auth
      forceNew: true, // Reuse existing connection if possible
      auth: {
        // Lấy auth_token từ localStorage (nếu có)
        token:
          (typeof window !== "undefined" &&
            (localStorage.getItem("auth_token") ||
              (typeof sessionStorage !== "undefined" &&
                sessionStorage.getItem("auth_token")))) ||
          undefined,
      },
    });

    // Add error handlers with detailed logging
    socket.on("connect", () => {
      console.log("[Socket Client] ✓ Connected successfully, ID:", socket?.id);
      console.log(
        "[Socket Client] Transport:",
        socket?.io?.engine?.transport?.name
      );
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket Client] Disconnected, reason:", reason);
      console.log(
        "[Socket Client] Will auto-reconnect:",
        socket?.io?._reconnecting || false
      );
    });

    socket.on("connect_error", (error: any) => {
      console.error("[Socket Client] Connection error:", {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
      });
      console.log("[Socket Client] Socket state:", {
        connected: socket?.connected,
        disconnected: socket?.disconnected,
        active: socket?.active,
      });
      // Socket.io will auto-retry
    });

    socket.on("auth_error", (error: any) => {
      console.error("[Socket] Auth error:", error.message || error);
      // Retry after delay if auth fails (cookie might not be set yet)
      if (socket && socket.connected) {
        socket.disconnect();
        setTimeout(() => {
          if (socket && socket.disconnected) {
            console.log("[Socket] Retrying after auth error...");
            socket.connect();
          }
        }, 2000);
      }
    });
  } else if (!socket.connected && !socket.active) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

// Lấy JWT từ cookie auth_token nếu có (dùng cho socket.auth.token)
function getAuthToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const tokenCookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("auth_token="));
  return tokenCookie ? tokenCookie.split("=")[1] : undefined;
}
