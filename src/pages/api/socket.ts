import { NextApiRequest } from "next";
import { Server as IOServer } from "socket.io";
import { setupSocketHandlers } from "@/server/socket-handler";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  // Ensure res.socket exists (required for Socket.io)
  if (!res.socket) {
    console.error(
      "[Socket API] ✗ res.socket is undefined! Cannot initialize Socket.io."
    );
    res.status(500).json({ error: "Socket not available" });
    return;
  }

  console.log("[Socket API] Handler called:", {
    method: req.method,
    url: req.url,
    headers: {
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      cookie: !!req.headers.cookie,
    },
    socketServerExists: !!res.socket?.server,
    ioExists: !!res.socket?.server?.io,
  });

  // Get or create Socket.io server instance
  let io: IOServer;
  if (!res.socket.server.io) {
    console.log("[Socket API] Initializing Socket.io server...");
    try {
      // Get allowed origins from env or use wildcard for development
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

      io = new IOServer(res.socket.server, {
        path: "/api/socket",
        cors: {
          origin:
            allowedOrigins.length === 1 && allowedOrigins[0] === "*"
              ? "*"
              : (origin, callback) => {
                  // Allow requests from allowed origins
                  if (
                    !origin ||
                    allowedOrigins.includes("*") ||
                    allowedOrigins.includes(origin)
                  ) {
                    callback(null, true);
                  } else {
                    callback(new Error("Not allowed by CORS"));
                  }
                },
          methods: ["GET", "POST"],
          credentials: true, // Allow cookies/credentials
          allowedHeaders: ["Content-Type", "Authorization"],
        },
        transports: ["websocket", "polling"], // Allow both for compatibility
      });
      res.socket.server.io = io;
      console.log("[Socket API] ✓ Socket.io server initialized successfully");
    } catch (error: any) {
      console.error("[Socket API] ✗ Failed to initialize Socket.io:", error);
      res.status(500).json({ error: "Failed to initialize Socket.io" });
      return;
    }
  } else {
    io = res.socket.server.io;
    console.log(
      "[Socket API] Socket.io server already initialized, reusing..."
    );
  }

  // Setup connection handler (only once)
  // Use a flag to track if handler is already set up
  if (!(res.socket.server as any)._socketIOHandlerSetup) {
    (res.socket.server as any)._socketIOHandlerSetup = true;
    setupSocketHandlers(io);
  } else {
    console.log("[Socket API] Socket.io handlers already setup, reusing...");
  }

  // Important: For Socket.io, we need to upgrade the connection
  // Don't end the response - Socket.io will handle it
  // Only end if it's not a WebSocket upgrade request
  if (!res.headersSent && !req.headers.upgrade) {
    res.end();
  }
}
