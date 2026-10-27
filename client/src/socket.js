import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export const socket = io(SERVER_URL, { autoConnect: false });

// Emits an event and resolves with the server's acknowledgement.
export const emitAck = (event, ...args) =>
  new Promise((resolve) => socket.emit(event, ...args, resolve));
