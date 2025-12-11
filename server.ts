import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketHandlers } from "./src/server/socket-handler";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Get allowed origins from environment variable
  // Format: "https://domain1.com,https://domain2.com" or "*" for all
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "*";
  const allowedOrigins =
    allowedOriginsEnv === "*"
      ? "*"
      : allowedOriginsEnv.split(",").map((origin) => origin.trim());

  console.log(
    `[Socket Server] CORS allowed origins: ${
      allowedOrigins === "*" ? "* (all)" : allowedOrigins.join(", ")
    }`
  );

  // CORS config: When credentials: true, cannot use "*" - must specify origins
  // Socket.IO's origin: true will automatically set Access-Control-Allow-Origin to the request origin
  // This works with credentials: true
  const corsConfig: any = {
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true, // CRITICAL: Allow cookies/credentials for auth
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  };

  if (allowedOrigins === "*") {
    // For development/local: allow all origins
    // Socket.IO will set Access-Control-Allow-Origin to the request origin (not "*")
    // This works with credentials: true
    corsConfig.origin = true;
    console.log(
      "[Socket Server] Using wildcard origin (auto-detect from request)"
    );
  } else {
    // For production: validate against allowed list
    corsConfig.origin = (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        console.log("[Socket Server] Allowing request with no origin");
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log(`[Socket Server] ✓ Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`[Socket Server] ✗ CORS blocked origin: ${origin}`);
        console.warn(
          `[Socket Server] Allowed origins: ${allowedOrigins.join(", ")}`
        );
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    };
  }

  // Initialize Socket.IO server with proper CORS
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: corsConfig,
    transports: ["websocket", "polling"],
  });

  // Setup socket handlers
  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized on /socket.io`);
    console.log(
      `> CORS allowed origins: ${
        allowedOrigins === "*" ? "* (all)" : allowedOrigins.join(", ")
      }`
    );
  });
});
