import { useEffect, useState } from "react";
import { socket, emitAck } from "./socket";
import Login from "./components/Login.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ChatWindow from "./components/ChatWindow.jsx";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState([]);

  useEffect(() => {
    const onConnect = () => setConnected(true);

    // The server forgets users on disconnect, so return to the login screen.
    const onDisconnect = () => {
      setConnected(false);
      setNickname(null);
      setRoom(null);
      setMessages([]);
      setTyping([]);
    };

    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.user) {
        setTyping((prev) => prev.filter((name) => name !== message.user));
      }
    };

    const onTyping = ({ user, isTyping }) => {
      setTyping((prev) => {
        const without = prev.filter((name) => name !== user);
        return isTyping ? [...without, user] : without;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("rooms", setRooms);
    socket.on("users", setUsers);
    socket.on("message", onMessage);
    socket.on("typing", onTyping);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("rooms", setRooms);
      socket.off("users", setUsers);
      socket.off("message", onMessage);
      socket.off("typing", onTyping);
      socket.disconnect();
    };
  }, []);

  const joinRoom = async (name) => {
    const res = await emitAck("join-room", name);
    if (res.ok) {
      setRoom(res.room);
      setMessages(res.history);
      setTyping([]);
    }
    return res;
  };

  const login = async (name) => {
    const res = await emitAck("login", name);
    if (res.ok) {
      setNickname(res.nickname);
      await joinRoom("General");
    }
    return res;
  };

  const createRoom = async (name) => {
    const res = await emitAck("create-room", name);
    if (res.ok) await joinRoom(res.room);
    return res;
  };

  const sendMessage = async (text) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, user: nickname, text, timestamp: Date.now(), status: "sending" },
    ]);

    const res = await emitAck("message", text);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== tempId) return m;
        return res.ok ? res.message : { ...m, status: "failed" };
      })
    );
  };

  if (!nickname) return <Login onLogin={login} connected={connected} />;

  return (
    <div className="app">
      <Sidebar
        rooms={rooms}
        users={users}
        currentRoom={room}
        nickname={nickname}
        onJoin={joinRoom}
        onCreate={createRoom}
      />
      <ChatWindow
        room={room}
        nickname={nickname}
        messages={messages}
        typing={typing}
        onSend={sendMessage}
      />
    </div>
  );
}
