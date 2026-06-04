import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const data = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Forgot Password</h1>
        <input placeholder="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="error">{error}</p>}
        {result && <div className="notice">
          <p>{result.message}</p>
          {result.resetToken && <p>Demo reset token: <strong>{result.resetToken}</strong></p>}
        </div>}
        <button className="primary-button">Generate Reset Token</button>
        <Link to="/reset-password">I have a reset token</Link>
        <Link to="/login">Back to login</Link>
      </form>
    </main>
  );
}
