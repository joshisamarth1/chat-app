import { useState } from "react";

export default function Login({ onLogin, connected }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const res = await onLogin(name);
    if (!res.ok) setError(res.error);
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Pick a nickname</h1>
        <p className="hint">You will join the General room.</p>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Nickname"
          maxLength={20}
          autoFocus
          aria-label="Nickname"
        />
        {error && <p className="error" role="alert">{error}</p>}
        {!connected && <p className="hint">Connecting to server…</p>}
        <button type="submit" disabled={!connected || !name.trim()}>
          Join chat
        </button>
      </form>
    </main>
  );
}
