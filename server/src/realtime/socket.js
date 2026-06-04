const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const documentsService = require("../services/documents.service");

let ioInstance;
const roomPresences = new Map();

function addPresence(roomId, socketId, presence) {
  if (!roomPresences.has(roomId)) {
    roomPresences.set(roomId, new Map());
  }
  roomPresences.get(roomId).set(socketId, presence);
}

function updatePresence(roomId, socketId, patch) {
  if (roomPresences.has(roomId) && roomPresences.get(roomId).has(socketId)) {
    const current = roomPresences.get(roomId).get(socketId);
    roomPresences.get(roomId).set(socketId, { ...current, ...patch });
  }
}

function removePresence(roomId, socketId) {
  if (roomPresences.has(roomId)) {
    roomPresences.get(roomId).delete(socketId);
    if (roomPresences.get(roomId).size === 0) {
      roomPresences.delete(roomId);
    }
  }
}

function getRoomUsers(roomId) {
  if (!roomPresences.has(roomId)) return [];
  const list = [];
  for (const [socketId, presence] of roomPresences.get(roomId).entries()) {
    list.push({ socketId, ...presence });
  }
  return list;
}

function handleUserDisconnect(socketId, io) {
  for (const [roomId, presences] of roomPresences.entries()) {
    if (presences.has(socketId)) {
      removePresence(roomId, socketId);
      io.to(roomId).emit("user.left", { socketId });
    }
  }
}

async function checkDocumentAccess(userId, documentId) {
  try {
    const doc = await documentsService.getById(documentId, userId);
    return doc !== null;
  } catch (err) {
    console.error("Access check error in socket join:", err);
    return false;
  }
}

exports.initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  // Authenticate socket connections using JWT
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded; // { id, email }
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.email} (${socket.id})`);

    socket.on("join-room", async ({ documentId }) => {
      const doc = await documentsService.getById(documentId, socket.user.id);
      if (!doc) {
        socket.emit("error-msg", { message: "Access denied: You do not have permission to access this design." });
        return;
      }

      socket.join(documentId);
      console.log(`User ${socket.user.email} joined room ${documentId}`);

      addPresence(documentId, socket.id, {
        user: {
          userId: socket.user.id,
          email: socket.user.email,
          role: doc.user_role,
        },
        cursor: null,
        selectedElementId: null,
      });

      // Broadcast user.joined to other users in the room
      socket.to(documentId).emit("user.joined", {
        socketId: socket.id,
        user: {
          userId: socket.user.id,
          email: socket.user.email,
          role: doc.user_role,
        },
      });

      // Send current users in room to the newly joined client
      const usersInRoom = getRoomUsers(documentId);
      socket.emit("room.users", usersInRoom);
    });

    socket.on("cursor.move", ({ documentId, x, y }) => {
      updatePresence(documentId, socket.id, { cursor: { x, y } });
      socket.to(documentId).emit("cursor.move", {
        socketId: socket.id,
        userId: socket.user.id,
        x,
        y,
      });
    });

    socket.on("selection.set", ({ documentId, elementId }) => {
      updatePresence(documentId, socket.id, { selectedElementId: elementId });
      socket.to(documentId).emit("selection.set", {
        socketId: socket.id,
        userId: socket.user.id,
        elementId,
      });
    });

    socket.on("element.op", ({ documentId, op }) => {
      const presences = roomPresences.get(documentId);
      const presence = presences ? presences.get(socket.id) : null;
      if (!presence || presence.user.role === "viewer") {
        return;
      }
      // Re-broadcast operation to all other clients in the document room
      socket.to(documentId).emit("element.op", op);
    });

    socket.on("disconnecting", () => {
      // Clean up presences for this socket across any joined rooms before they are removed
      const rooms = Array.from(socket.rooms);
      for (const roomId of rooms) {
        if (roomId !== socket.id) {
          removePresence(roomId, socket.id);
          socket.to(roomId).emit("user.left", { socketId: socket.id });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};
