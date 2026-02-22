import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

export function createSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.emit("race:welcome", { message: "Realtime race server connected" });
  });

  return io;
}

