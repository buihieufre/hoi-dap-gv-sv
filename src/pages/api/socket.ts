import { NextApiRequest } from "next";
import { Server as IOServer } from "socket.io";
import { setupSocketHandlers } from "@/server/socket-handler";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  // Handle CORS preflight (OPTIONS) requests explicitly
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "*";
    const allowedOrigins =
      allowedOriginsEnv === "*"
        ? "*"
        : allowedOriginsEnv.split(",").map((origin) => origin.trim());

    let allowOrigin = "*";
    if (allowedOrigins !== "*" && origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else if (allowedOrigins === "*" && origin) {
      allowOrigin = origin; // Echo back the origin when using wildcard
    }

    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie"
    );
    res.status(200).end();
    return;
  }

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
    origin: req.headers.origin,
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
      const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "*";
      const allowedOrigins =
        allowedOriginsEnv === "*"
          ? "*"
          : allowedOriginsEnv.split(",").map((origin) => origin.trim());

      console.log("[Socket API] Allowed origins:", allowedOrigins);

      // CORS config: When credentials: true, cannot use "*" - must specify origins
      // Socket.IO's origin: true will automatically set Access-Control-Allow-Origin to the request origin
      // This works with credentials: true
      const corsConfig: any = {
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
      };

      if (allowedOrigins === "*") {
        // For development/local: allow all origins
        // Socket.IO will set Access-Control-Allow-Origin to the request origin (not "*")
        // This works with credentials: true
        corsConfig.origin = true;
        console.log(
          "[Socket API] Using wildcard origin (auto-detect from request)"
        );
      } else {
        // For production: validate against allowed list
        corsConfig.origin = (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void
        ) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) {
            console.log("[Socket API] Allowing request with no origin");
            callback(null, true);
            return;
          }

          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            console.log(`[Socket API] ✓ Allowing origin: ${origin}`);
            callback(null, true);
          } else {
            console.warn(`[Socket API] ✗ CORS blocked origin: ${origin}`);
            console.warn(
              `[Socket API] Allowed origins: ${allowedOrigins.join(", ")}`
            );
            callback(new Error(`Not allowed by CORS: ${origin}`));
          }
        };
      }

      io = new IOServer(res.socket.server, {
        path: "/api/socket",
        cors: corsConfig,
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
