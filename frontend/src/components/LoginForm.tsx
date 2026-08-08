import { useState } from "react";
import { api, setToken } from "../api/client";

export function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "register") {
        await api.register(email, password);
      }
      const token = await api.login(email, password);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1>Personal Dashboard</h1>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">{mode === "login" ? "Log in" : "Register"}</button>
      <button type="button" className="link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
      </button>
      {error && <p className="widget-error">{error}</p>}
    </form>
  );
}
