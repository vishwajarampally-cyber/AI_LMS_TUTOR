import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function ResetPassword() {
  const [form, setForm] = useState({ token: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(data.message);
      setForm({ token: "", password: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Reset Password</h1>
        <input placeholder="Reset token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value.trim() })} />
        <input placeholder="New password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button className="primary-button">Reset Password</button>
        <Link to="/login">Back to login</Link>
      </form>
    </main>
  );
}
