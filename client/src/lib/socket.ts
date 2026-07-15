import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function initSocket(token: string): Socket {
  if (socketInstance) {
    socketInstance.disconnect();
  }

  // Configure Socket.IO using VITE_SOCKET_URL or current browser origin
  socketInstance = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    console.log("Socket.IO connected successfully.");
  });

  socketInstance.on("connect_error", (err) => {
    console.error("Socket.IO connection error:", err.message);
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
