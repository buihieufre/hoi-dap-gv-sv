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
  const allowedOrigins = allowedOriginsEnv === "*" 
    ? "*" 
    : allowedOriginsEnv.split(",").map(origin => origin.trim());

  // Initialize Socket.IO server with proper CORS
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins === "*"
        ? "*"
        : (origin, callback) => {
            // Allow requests from allowed origins
            if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              console.warn(`[Socket] CORS blocked origin: ${origin}`);
              callback(new Error("Not allowed by CORS"));
            }
          },
      methods: ["GET", "POST"],
      credentials: true, // CRITICAL: Allow cookies/credentials for auth
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
  });

  // Setup socket handlers
  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized on /socket.io`);
    console.log(`> CORS allowed origins: ${allowedOrigins === "*" ? "* (all)" : allowedOrigins.join(", ")}`);
  });
});

