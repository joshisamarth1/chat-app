import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

const TYPING_TIMEOUT_MS = 1500;
const STATUS_LABEL = {
  sending: "Sending…",
  sent: "✓ Sent",
  failed: "✗ Failed",
};

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const typingLabel = (names) => {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  return `${names.join(", ")} are typing…`;
};

export default function ChatWindow({ room, nickname, messages, typing, onSend }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  // Auto-scroll on new messages and typing changes.
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, typing]);

  // Reset the draft and typing timer when switching rooms.
  useEffect(() => {
    setText("");
    return () => {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    };
  }, [room]);

  const handleChange = (event) => {
    setText(event.target.value);
    if (!typingTimer.current) socket.emit("typing", true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", false);
      typingTimer.current = null;
    }, TYPING_TIMEOUT_MS);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;

    clearTimeout(typingTimer.current);
    typingTimer.current = null;
    socket.emit("typing", false);

    onSend(body);
    setText("");
  };

  return (
    <section className="chat">
      <header className="chat-header">
        <h2># {room}</h2>
        <span className="hint">Signed in as {nickname}</span>
      </header>

      <div className="messages" aria-live="polite">
        {messages.map((m) =>
          m.system ? (
            <div key={m.id} className="system">
              {m.text}
            </div>
          ) : (
            <div
              key={m.id}
              className={`msg ${m.user === nickname ? "own" : ""}`}
            >
              {m.user !== nickname && <span className="author">{m.user}</span>}
              <p>{m.text}</p>
              <span className="meta">
                <time>{formatTime(m.timestamp)}</time>
                {m.user === nickname && <span>{STATUS_LABEL[m.status]}</span>}
              </span>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <div className="typing" aria-live="polite">
        {typingLabel(typing)}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={handleChange}
          placeholder={`Message #${room}`}
          maxLength={1000}
          aria-label="Message"
        />
        <button type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
