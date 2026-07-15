const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const documentsService = require("../services/documents.service");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

let ioInstance;
const roomPresences = new Map();
const userSockets = new Map(); // Map of userId -> Set of socketId

// Zod Validation Schemas
const JoinRoomSchema = z.object({
  documentId: z.string().uuid(),
});

const CursorMoveSchema = z.object({
  documentId: z.string().uuid(),
  x: z.number(),
  y: z.number(),
});

const SelectionSetSchema = z.object({
  documentId: z.string().uuid(),
  elementId: z.string().nullable(),
});

const ElementOpSchema = z.object({
  documentId: z.string().uuid(),
  op: z.object({
    type: z.enum([
      "element.add",
      "element.update",
      "element.delete",
      "element.reorder",
      "canvas.update",
    ]),
    payload: z.any(),
  }),
  seq: z.number().optional(), // operation sequence/version check
});

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

// Global hook to revoke a user's access when permissions change
function revokeSocketAccess(userId, documentId) {
  const socketIds = userSockets.get(userId);
  if (!socketIds || !ioInstance) return;

  for (const socketId of socketIds) {
    const socket = ioInstance.sockets.sockets.get(socketId);
    if (socket && socket.rooms.has(documentId)) {
      socket.leave(documentId);
      removePresence(documentId, socketId);
      socket.to(documentId).emit("user.left", { socketId });
      socket.emit("permission.revoked", {
        documentId,
        message: "Your permission to this design has been removed.",
      });
      console.log(`Revoked socket ${socketId} from room ${documentId}`);
    }
  }
}

// Verify socket has joined the room and holds write permission
async function verifyWriteAccess(socket, documentId) {
  if (!socket.rooms.has(documentId)) {
    socket.emit("error-msg", { message: "Access denied: Room not joined." });
    return false;
  }
  try {
    const doc = await documentsService.getById(documentId, socket.user.id);
    if (!doc) {
      socket.emit("error-msg", { message: "Access denied: Document not found." });
      return false;
    }
    if (doc.user_role === "viewer") {
      socket.emit("error-msg", { message: "Access denied: Viewers cannot modify this design." });
      return false;
    }
    return doc;
  } catch (err) {
    socket.emit("error-msg", { message: "Access verification error." });
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

  // Authenticate socket connections using JWT from auth payload
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }
    try {
      if (!JWT_ACCESS_SECRET) {
        return next(new Error("Authentication configuration missing on server"));
      }
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      socket.user = decoded; // { id, email }
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${socket.user.email} (${socket.id})`);

    // Track user socket ID mapping
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    socket.on("join-room", async (data) => {
      try {
        const parsed = JoinRoomSchema.parse(data);
        const documentId = parsed.documentId;

        const doc = await documentsService.getById(documentId, userId);
        if (!doc) {
          socket.emit("error-msg", { message: "Access denied: Document not found or unauthorized." });
          return;
        }

        // Leave any other document rooms previously joined (leak prevention)
        const joinedRooms = Array.from(socket.rooms);
        for (const room of joinedRooms) {
          if (room !== socket.id && room !== documentId) {
            socket.leave(room);
            removePresence(room, socket.id);
            socket.to(room).emit("user.left", { socketId: socket.id });
          }
        }

        socket.join(documentId);
        console.log(`User ${socket.user.email} joined room ${documentId}`);

        addPresence(documentId, socket.id, {
          user: {
            userId,
            email: socket.user.email,
            role: doc.user_role,
          },
          cursor: null,
          selectedElementId: null,
        });

        // Broadcast join to others
        socket.to(documentId).emit("user.joined", {
          socketId: socket.id,
          user: {
            userId,
            email: socket.user.email,
            role: doc.user_role,
          },
        });

        // Send current room users back to joining socket
        const usersInRoom = getRoomUsers(documentId);
        socket.emit("room.users", usersInRoom);
      } catch (err) {
        socket.emit("error-msg", { message: "Payload validation failed." });
      }
    });

    socket.on("leave-room", (data) => {
      try {
        const parsed = JoinRoomSchema.parse(data);
        const documentId = parsed.documentId;

        socket.leave(documentId);
        removePresence(documentId, socket.id);
        socket.to(documentId).emit("user.left", { socketId: socket.id });
      } catch (err) {
        // Ignore invalid schema leave
      }
    });

    socket.on("cursor.move", async (data) => {
      try {
        const parsed = CursorMoveSchema.parse(data);
        const { documentId, x, y } = parsed;

        if (!socket.rooms.has(documentId)) return;

        updatePresence(documentId, socket.id, { cursor: { x, y } });
        socket.to(documentId).emit("cursor.move", {
          socketId: socket.id,
          userId,
          x,
          y,
        });
      } catch (err) {
        // Ignore
      }
    });

    socket.on("selection.set", async (data) => {
      try {
        const parsed = SelectionSetSchema.parse(data);
        const { documentId, elementId } = parsed;

        if (!socket.rooms.has(documentId)) return;

        updatePresence(documentId, socket.id, { selectedElementId: elementId });
        socket.to(documentId).emit("selection.set", {
          socketId: socket.id,
          userId,
          elementId,
        });
      } catch (err) {
        // Ignore
      }
    });

    socket.on("element.op", async (data) => {
      try {
        const parsed = ElementOpSchema.parse(data);
        const { documentId, op, seq } = parsed;

        const doc = await verifyWriteAccess(socket, documentId);
        if (!doc) return;

        // Re-broadcast mutation operation with sequence/version info
        socket.to(documentId).emit("element.op", {
          ...op,
          seq: seq || doc.version,
        });
      } catch (err) {
        socket.emit("error-msg", { message: "Operation validation failed." });
      }
    });

    socket.on("disconnecting", () => {
      const rooms = Array.from(socket.rooms);
      for (const roomId of rooms) {
        if (roomId !== socket.id) {
          removePresence(roomId, socket.id);
          socket.to(roomId).emit("user.left", { socketId: socket.id });
        }
      }
      
      const socketIds = userSockets.get(userId);
      if (socketIds) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          userSockets.delete(userId);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

exports.revokeSocketAccess = revokeSocketAccess;
