import type { Server as IOServer } from "socket.io";

const globalForSocket = globalThis as unknown as {
  io?: IOServer;
};

export function setIO(io: IOServer) {
  globalForSocket.io = io;
}

export function getIO(): IOServer | undefined {
  return globalForSocket.io;
}
