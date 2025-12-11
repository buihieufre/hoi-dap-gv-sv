import { NextApiRequest } from "next";
import { Server as IOServer } from "socket.io";
import { setupSocketHandlers } from "@/server/socket-handler";

// Lấy origin từ biến môi trường ALLOWED_ORIGINS, tách thành mảng, bỏ trắng và loại undefined
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket) {
    res.status(500).json({ error: "Socket not available" });
    return;
  }

  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      },
      transports: ["websocket", "polling"],
    });
    res.socket.server.io = io;
    setupSocketHandlers(io);
  }

  res.end();
}
