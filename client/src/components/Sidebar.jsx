import { useState } from "react";

export default function Sidebar({
  rooms,
  users,
  currentRoom,
  nickname,
  onJoin,
  onCreate,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const res = await onCreate(name);
    if (res.ok) {
      setName("");
      setError("");
    } else {
      setError(res.error);
    }
  };

  return (
    <aside className="sidebar">
      <section>
        <h2>Rooms</h2>
        <ul className="list">
          {rooms.map((r) => (
            <li key={r.name}>
              <button
                type="button"
                className={`room ${r.name === currentRoom ? "active" : ""}`}
                onClick={() => onJoin(r.name)}
                aria-current={r.name === currentRoom}
              >
                <span># {r.name}</span>
                <span className="count">{r.count}</span>
              </button>
            </li>
          ))}
        </ul>
        <form className="create" onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="New room name"
            maxLength={20}
            aria-label="New room name"
          />
          <button type="submit" disabled={!name.trim()}>
            Create
          </button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section>
        <h2>Online ({users.length})</h2>
        <ul className="list">
          {users.map((u) => (
            <li key={u.nickname} className="user">
              <span className="dot" aria-hidden="true" />
              <span className="user-name">
                {u.nickname}
                {u.nickname === nickname && " (you)"}
              </span>
              {u.room && <span className="user-room">{u.room}</span>}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
