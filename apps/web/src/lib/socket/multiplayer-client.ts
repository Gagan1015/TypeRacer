import { io, type Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function createMultiplayerSocket(): Socket {
  return io(API_URL, {
    withCredentials: true,
    autoConnect: false,
    reconnection: true
  });
}

