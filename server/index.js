import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import { Server } from "socket.io";

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const DEFAULT_ROOMS = ["General", "Tech", "Random"];
const HISTORY_LIMIT = 100;
const NAME_MIN = 2;
const NAME_MAX = 20;
const MESSAGE_MAX = 1000;

const app = express();
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });

// In-memory state.
const rooms = new Map(DEFAULT_ROOMS.map((name) => [name, []])); // room -> messages
const users = new Map(); // socket.id -> { nickname, room }

const validName = (value) => {
  const name = String(value ?? "").trim();
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null;
};

const roomMembers = (room) =>
  [...users.values()].filter((user) => user.room === room).length;

const roomList = () =>
  [...rooms.keys()].map((name) => ({ name, count: roomMembers(name) }));

const userList = () =>
  [...users.values()].map(({ nickname, room }) => ({ nickname, room }));

const broadcastState = () => {
  io.emit("rooms", roomList());
  io.emit("users", userList());
};

const pushHistory = (room, message) => {
  const history = rooms.get(room);
  history.push(message);
  if (history.length > HISTORY_LIMIT) history.shift();
};

// Sends a system message to everyone in the room except the given socket.
const announce = (socket, room, text) => {
  const message = {
    id: randomUUID(),
    system: true,
    text,
    timestamp: Date.now(),
  };
  pushHistory(room, message);
  socket.to(room).emit("message", message);
};

const leaveRoom = (socket) => {
  const user = users.get(socket.id);
  if (!user?.room) return;

  const { room, nickname } = user;
  user.room = null;
  socket.leave(room);
  socket.to(room).emit("typing", { user: nickname, isTyping: false });
  announce(socket, room, `${nickname} left`);

  if (!DEFAULT_ROOMS.includes(room) && roomMembers(room) === 0) {
    rooms.delete(room);
  }
};

io.on("connection", (socket) => {
  socket.emit("rooms", roomList());
  socket.emit("users", userList());

  socket.on("login", (nickname, ack = () => {}) => {
    const name = validName(nickname);
    if (!name) {
      return ack({
        ok: false,
        error: `Nickname must be ${NAME_MIN}-${NAME_MAX} characters.`,
      });
    }
    const taken = [...users.values()].some(
      (user) => user.nickname.toLowerCase() === name.toLowerCase()
    );
    if (taken) return ack({ ok: false, error: "Nickname is already taken." });

    users.set(socket.id, { nickname: name, room: null });
    ack({ ok: true, nickname: name });
    broadcastState();
  });

  socket.on("create-room", (roomName, ack = () => {}) => {
    if (!users.has(socket.id)) return ack({ ok: false, error: "Log in first." });

    const name = validName(roomName);
    if (!name) {
      return ack({
        ok: false,
        error: `Room name must be ${NAME_MIN}-${NAME_MAX} characters.`,
      });
    }
    const exists = [...rooms.keys()].some(
      (room) => room.toLowerCase() === name.toLowerCase()
    );
    if (exists) return ack({ ok: false, error: "Room already exists." });

    rooms.set(name, []);
    ack({ ok: true, room: name });
    broadcastState();
  });

  socket.on("join-room", (roomName, ack = () => {}) => {
    const user = users.get(socket.id);
    if (!user) return ack({ ok: false, error: "Log in first." });
    if (!rooms.has(roomName)) return ack({ ok: false, error: "Room not found." });
    if (user.room === roomName) {
      return ack({ ok: true, room: roomName, history: rooms.get(roomName) });
    }

    leaveRoom(socket);
    user.room = roomName;
    socket.join(roomName);
    announce(socket, roomName, `${user.nickname} joined`);
    ack({ ok: true, room: roomName, history: rooms.get(roomName) });
    broadcastState();
  });

  socket.on("message", (text, ack = () => {}) => {
    const user = users.get(socket.id);
    if (!user?.room) return ack({ ok: false, error: "Join a room first." });

    const body = String(text ?? "").trim();
    if (!body || body.length > MESSAGE_MAX) {
      return ack({ ok: false, error: "Invalid message." });
    }

    const message = {
      id: randomUUID(),
      user: user.nickname,
      text: body,
      timestamp: Date.now(),
      status: "sent",
    };
    pushHistory(user.room, message);
    socket.to(user.room).emit("message", message);
    ack({ ok: true, message });
  });

  socket.on("typing", (isTyping) => {
    const user = users.get(socket.id);
    if (!user?.room) return;
    socket
      .to(user.room)
      .emit("typing", { user: user.nickname, isTyping: Boolean(isTyping) });
  });

  socket.on("disconnect", () => {
    leaveRoom(socket);
    users.delete(socket.id);
    broadcastState();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
