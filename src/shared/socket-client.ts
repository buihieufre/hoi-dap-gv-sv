import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    console.log("[Socket Client] Creating new socket instance...");

    // Use NEXT_PUBLIC_SOCKET_URL if set (Railway), otherwise use same origin (Vercel/local)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "/";
    const socketPath = process.env.NEXT_PUBLIC_SOCKET_URL
      ? "/socket.io" // Railway uses /socket.io
      : "/api/socket"; // Vercel/local uses /api/socket

    console.log(
      "[Socket Client] Connecting to:",
      socketUrl,
      "path:",
      socketPath
    );

    socket = io(socketUrl, {
      path: socketPath,
      transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Reconnect forever
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000, // Reduce timeout to fail faster
      withCredentials: true, // Ensure cookies are sent
      forceNew: false, // Reuse existing connection if possible
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
