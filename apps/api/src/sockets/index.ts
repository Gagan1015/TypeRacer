import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { env } from "../config/env.js";

export function createSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: [env.CORS_ORIGIN],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.emit("race:welcome", { message: "Realtime race server connected" });
  });

  return io;
}
